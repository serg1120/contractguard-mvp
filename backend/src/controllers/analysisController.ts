import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ContractModel, Contract, RiskFinding, ContractWithRiskFindings } from '../models/Contract';
import { query } from '../utils/database';
import { PatternAnalysisService } from '../services/patternAnalysisService';
import { OpenAIAnalysisService } from '../services/openaiAnalysisService';
import { ReportGenerationService } from '../services/reportGenerationService';

export interface AnalysisRequest extends AuthRequest {
  params: {
    id: string;
  };
}

export interface AnalysisStatus {
  contractId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  riskScore?: 'HIGH' | 'MEDIUM' | 'LOW';
  findingsCount?: number;
  completedAt?: Date;
  error?: string;
}

export class AnalysisController {
  /**
   * Start contract analysis process
   * Orchestrates pattern matching and OpenAI analysis
   */
  static async analyzeContract(
    req: AnalysisRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new AppError('Invalid contract ID', 400);
      }

      // Verify contract exists and belongs to user
      const contract = await ContractModel.findByIdAndUserId(contractId, req.userId);
      if (!contract) {
        throw new AppError('Contract not found or access denied', 404);
      }

      // Check if contract has extracted text
      if (!contract.extracted_text || contract.extracted_text.trim().length === 0) {
        throw new AppError('Contract has no extracted text to analyze', 400);
      }

      // Check if analysis is already completed
      if (contract.analysis_completed) {
        throw new AppError('Contract analysis already completed', 400);
      }

      // Start analysis process asynchronously
      AnalysisController.performAnalysis(contractId, contract.extracted_text)
        .catch(error => {
          console.error(`Analysis failed for contract ${contractId}:`, error);
          // Update contract status to indicate failure
          AnalysisController.updateAnalysisStatus(contractId, 'failed', error.message);
        });

      // Return immediate response
      res.status(202).json({
        success: true,
        data: {
          contractId,
          status: 'in_progress',
          message: 'Analysis started successfully'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analysis status for a contract
   */
  static async getAnalysisStatus(
    req: AnalysisRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new AppError('Invalid contract ID', 400);
      }

      // Verify contract exists and belongs to user
      const contract = await ContractModel.findByIdAndUserId(contractId, req.userId);
      if (!contract) {
        throw new AppError('Contract not found or access denied', 404);
      }

      // Get contract with risk findings
      const contractWithFindings = await ContractModel.findById(contractId);
      if (!contractWithFindings) {
        throw new AppError('Contract not found', 404);
      }

      // Determine analysis status
      let status: AnalysisStatus['status'] = 'pending';
      let progress = 0;
      let message = 'Analysis not started';

      if (contract.analysis_completed) {
        status = 'completed';
        progress = 100;
        message = 'Analysis completed successfully';
      } else if (contract.extracted_text) {
        // Check if analysis is in progress (this is a simple check)
        // In a real system, you might use a job queue or Redis to track progress
        status = 'in_progress';
        progress = 50;
        message = 'Analysis in progress';
      }

      const analysisStatus: AnalysisStatus = {
        contractId,
        status,
        progress,
        message,
        riskScore: contract.risk_score,
        findingsCount: contractWithFindings.risk_findings?.length || 0,
        completedAt: contract.analysis_completed ? contract.uploaded_at : undefined
      };

      res.status(200).json({
        success: true,
        data: analysisStatus
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate PDF report for analyzed contract
   */
  static async generateReport(
    req: AnalysisRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new AppError('Invalid contract ID', 400);
      }

      // Verify contract exists and belongs to user
      const contract = await ContractModel.findByIdAndUserId(contractId, req.userId);
      if (!contract) {
        throw new AppError('Contract not found or access denied', 404);
      }

      // Check if analysis is completed
      if (!contract.analysis_completed) {
        throw new AppError('Contract analysis not completed yet', 400);
      }

      // Get contract with risk findings
      const contractWithFindings = await ContractModel.findById(contractId);
      if (!contractWithFindings) {
        throw new AppError('Contract not found', 404);
      }

      // Generate PDF report
      const reportBuffer = await ReportGenerationService.generatePDFReport(
        contract,
        contractWithFindings.risk_findings || []
      );

      // Set response headers for PDF download
      const filename = `contract_analysis_report_${contractId}_${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', reportBuffer.length);

      // Send PDF buffer
      res.status(200).send(reportBuffer);

    } catch (error) {
      next(error);
    }
  }

  /**
   * Perform the actual analysis (public method)
   * This orchestrates both pattern matching and OpenAI analysis
   */
  public static async performAnalysis(contractId: number, extractedText: string): Promise<void> {
    console.log(`Starting analysis for contract ${contractId}`);
    
    try {
      // Start database transaction
      await query('BEGIN');

      // Step 1: Pattern-based analysis
      console.log(`Running pattern analysis for contract ${contractId}`);
      const patternFindings = await PatternAnalysisService.analyzeContract(extractedText);

      // Step 2: OpenAI analysis
      console.log(`Running OpenAI analysis for contract ${contractId}`);
      const openaiFindings = await OpenAIAnalysisService.analyzeContract(extractedText);

      // Step 3: Combine and deduplicate findings
      const allFindings = [...patternFindings, ...openaiFindings];
      const uniqueFindings = AnalysisController.deduplicateFindings(allFindings);

      // Step 4: Calculate overall risk score
      const riskScore = AnalysisController.calculateOverallRiskScore(uniqueFindings);

      // Step 5: Update contract with analysis results
      await ContractModel.updateAnalysis(contractId, {
        risk_score: riskScore,
        analysis_completed: true,
        risk_findings: uniqueFindings
      });

      // Commit transaction
      await query('COMMIT');

      console.log(`Analysis completed for contract ${contractId}. Risk score: ${riskScore}, Findings: ${uniqueFindings.length}`);

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      console.error(`Analysis failed for contract ${contractId}:`, error);
      throw error;
    }
  }

  /**
   * Update analysis status in case of failure
   */
  private static async updateAnalysisStatus(
    contractId: number,
    status: 'failed',
    errorMessage: string
  ): Promise<void> {
    try {
      // In a real system, you might want to store failure status in a separate table
      // For now, we'll just log the error
      console.error(`Analysis failed for contract ${contractId}: ${errorMessage}`);
      
      // You could also update a status field in the database if needed
      // await query('UPDATE contracts SET analysis_status = $1, analysis_error = $2 WHERE id = $3', 
      //   [status, errorMessage, contractId]);
    } catch (error) {
      console.error('Failed to update analysis status:', error);
    }
  }

  /**
   * Deduplicate similar risk findings
   */
  private static deduplicateFindings(findings: RiskFinding[]): RiskFinding[] {
    const uniqueFindings: RiskFinding[] = [];
    const seenFindings = new Set<string>();

    for (const finding of findings) {
      // Create a key based on risk type and problematic text
      const key = `${finding.risk_type}_${finding.problematic_text?.substring(0, 100)}`;
      
      if (!seenFindings.has(key)) {
        seenFindings.add(key);
        uniqueFindings.push(finding);
      }
    }

    return uniqueFindings;
  }

  /**
   * Calculate overall risk score based on findings
   */
  private static calculateOverallRiskScore(findings: RiskFinding[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (findings.length === 0) {
      return 'LOW';
    }

    const highRiskCount = findings.filter(f => f.risk_level === 'HIGH').length;
    const mediumRiskCount = findings.filter(f => f.risk_level === 'MEDIUM').length;
    const lowRiskCount = findings.filter(f => f.risk_level === 'LOW').length;

    // Risk calculation logic
    if (highRiskCount >= 3) {
      return 'HIGH';
    } else if (highRiskCount >= 1 || mediumRiskCount >= 5) {
      return 'HIGH';
    } else if (mediumRiskCount >= 2 || lowRiskCount >= 8) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Get analysis results for a contract
   */
  static async getAnalysisResults(
    req: AnalysisRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate authenticated user
      if (!req.userId) {
        throw new AppError('User not authenticated', 401);
      }

      const contractId = parseInt(req.params.id);
      if (!contractId || isNaN(contractId)) {
        throw new AppError('Invalid contract ID', 400);
      }

      // Verify contract exists and belongs to user
      const contract = await ContractModel.findByIdAndUserId(contractId, req.userId);
      if (!contract) {
        throw new AppError('Contract not found or access denied', 404);
      }

      // Get contract with risk findings
      const contractWithFindings = await ContractModel.findById(contractId);
      if (!contractWithFindings) {
        throw new AppError('Contract not found', 404);
      }

      // Check if analysis is completed
      if (!contract.analysis_completed) {
        throw new AppError('Contract analysis not completed yet', 400);
      }

      // Group findings by risk level
      const riskFindings = contractWithFindings.risk_findings || [];
      const groupedFindings = {
        HIGH: riskFindings.filter(f => f.risk_level === 'HIGH'),
        MEDIUM: riskFindings.filter(f => f.risk_level === 'MEDIUM'),
        LOW: riskFindings.filter(f => f.risk_level === 'LOW')
      };

      // Calculate statistics
      const stats = {
        totalFindings: riskFindings.length,
        highRiskCount: groupedFindings.HIGH.length,
        mediumRiskCount: groupedFindings.MEDIUM.length,
        lowRiskCount: groupedFindings.LOW.length,
        overallRiskScore: contract.risk_score
      };

      res.status(200).json({
        success: true,
        data: {
          contract: {
            id: contract.id,
            filename: contract.filename,
            nickname: contract.nickname,
            contractor_name: contract.contractor_name,
            project_name: contract.project_name,
            risk_score: contract.risk_score,
            analysis_completed: contract.analysis_completed,
            uploaded_at: contract.uploaded_at
          },
          findings: groupedFindings,
          statistics: stats
        }
      });

    } catch (error) {
      next(error);
    }
  }
}