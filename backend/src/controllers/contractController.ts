import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, AuthenticationError, NotFoundError, FileProcessingError } from '../middleware/errorHandler';
import { ResponseFormatter } from '../utils/responseFormatter';
import { PDFExtractorService } from '../services/pdfExtractor';
import { query } from '../utils/database';
import path from 'path';
import fs from 'fs';

export interface ContractUploadRequest extends AuthRequest {
  file?: Express.Multer.File;
  body: {
    nickname?: string;
    contractor_name?: string;
    project_name?: string;
  };
}

export interface Contract {
  id: number;
  user_id: number;
  filename: string;
  nickname?: string;
  contractor_name?: string;
  project_name?: string;
  risk_score?: 'HIGH' | 'MEDIUM' | 'LOW';
  uploaded_at: Date;
  file_path: string;
  extracted_text?: string;
  analysis_completed: boolean;
  created_at: Date;
}

export class ContractController {
  /**
   * Upload and process a contract PDF
   */
  static async uploadContract(
    req: ContractUploadRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AuthenticationError('User not authenticated');
      }

      // Validate file upload
      if (!req.file) {
        throw new FileProcessingError('No file uploaded');
      }

      // Validate PDF file
      PDFExtractorService.validatePDF(req.file);

      // Extract text from PDF
      const extractionResult = await PDFExtractorService.extractText(req.file.buffer);

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname;
      const filename = `${timestamp}_${originalName}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file to disk
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      // Save contract metadata to database
      const insertQuery = `
        INSERT INTO contracts (
          user_id, filename, nickname, contractor_name, project_name, 
          file_path, extracted_text, uploaded_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, filename, nickname, contractor_name, project_name, uploaded_at
      `;

      const values = [
        req.userId,
        originalName,
        req.body.nickname || null,
        req.body.contractor_name || null,
        req.body.project_name || null,
        filePath,
        extractionResult.text
      ];

      const result = await query(insertQuery, values);
      const contract = result.rows[0];

      // Automatically trigger analysis after successful upload
      try {
        const { AnalysisController } = await import('./analysisController');
        // Create a mock request object for the analysis controller
        const analysisReq = {
          userId: req.userId,
          params: { id: contract.id.toString() }
        } as any;
        
        // Start analysis asynchronously (don't wait for completion)
        AnalysisController.performAnalysis(contract.id, extractionResult.text)
          .catch(error => {
            console.error(`Auto-analysis failed for contract ${contract.id}:`, error);
          });
      } catch (error) {
        console.error('Failed to start auto-analysis:', error);
        // Don't fail the upload if analysis fails to start
      }

      // Return success response
      ResponseFormatter.contractUploaded(res, contract, true);

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of contracts for authenticated user
   */
  static async getContracts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AuthenticationError('User not authenticated');
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get contracts from database
      const contractsQuery = `
        SELECT 
          id, filename, nickname, contractor_name, project_name,
          risk_score, uploaded_at, analysis_completed, created_at
        FROM contracts 
        WHERE user_id = $1 
        ORDER BY uploaded_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM contracts 
        WHERE user_id = $1
      `;

      const [contractsResult, countResult] = await Promise.all([
        query(contractsQuery, [req.userId, limit, offset]),
        query(countQuery, [req.userId])
      ]);

      const contracts = contractsResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      ResponseFormatter.successWithPagination(res, contracts, {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single contract details
   */
  static async getContract(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new FileProcessingError('Invalid contract ID');
      }

      // Get contract from database
      const contractQuery = `
        SELECT 
          id, user_id, filename, nickname, contractor_name, project_name,
          risk_score, uploaded_at, file_path, extracted_text, 
          analysis_completed, created_at
        FROM contracts 
        WHERE id = $1 AND user_id = $2
      `;

      const result = await query(contractQuery, [contractId, req.userId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Contract');
      }

      const contract = result.rows[0];

      // Get risk findings for this contract
      const findingsQuery = `
        SELECT 
          id, risk_type, risk_level, problematic_text, 
          explanation, created_at
        FROM risk_findings 
        WHERE contract_id = $1 
        ORDER BY risk_level DESC, created_at DESC
      `;

      const findingsResult = await query(findingsQuery, [contractId]);
      const riskFindings = findingsResult.rows;

      // Return contract details
      ResponseFormatter.success(res, {
        contract: {
          id: contract.id,
          filename: contract.filename,
          nickname: contract.nickname,
          contractor_name: contract.contractor_name,
          project_name: contract.project_name,
          risk_score: contract.risk_score,
          uploaded_at: contract.uploaded_at,
          analysis_completed: contract.analysis_completed,
          created_at: contract.created_at,
          textLength: contract.extracted_text ? contract.extracted_text.length : 0
        },
        riskFindings
      }, 'Contract details retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a contract
   */
  static async deleteContract(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new FileProcessingError('Invalid contract ID');
      }

      // Get contract to verify ownership and get file path
      const contractQuery = `
        SELECT file_path 
        FROM contracts 
        WHERE id = $1 AND user_id = $2
      `;

      const contractResult = await query(contractQuery, [contractId, req.userId]);

      if (contractResult.rows.length === 0) {
        throw new NotFoundError('Contract');
      }

      const filePath = contractResult.rows[0].file_path;

      // Delete contract from database (cascade will delete risk findings)
      const deleteQuery = `
        DELETE FROM contracts 
        WHERE id = $1 AND user_id = $2
      `;

      await query(deleteQuery, [contractId, req.userId]);

      // Delete file from disk
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
          // Don't throw error for file deletion failure
        }
      }

      ResponseFormatter.success(res, null, 'Contract deleted successfully');

    } catch (error) {
      next(error);
    }
  }
}