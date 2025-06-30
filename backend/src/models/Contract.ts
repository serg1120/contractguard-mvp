import { query } from '../utils/database';

export interface Contract {
  id?: number;
  user_id: number;
  filename?: string;
  nickname?: string;
  contractor_name?: string;
  project_name?: string;
  risk_score?: 'HIGH' | 'MEDIUM' | 'LOW';
  uploaded_at?: Date;
  file_path?: string;
  extracted_text?: string;
  analysis_completed?: boolean;
  created_at?: Date;
}

export interface RiskFinding {
  id?: number;
  contract_id: number;
  risk_type?: string;
  risk_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  problematic_text?: string;
  explanation?: string;
  created_at?: Date;
}

export interface ContractWithRiskFindings extends Contract {
  risk_findings?: RiskFinding[];
}

export class ContractModel {
  /**
   * Create a new contract with file information
   */
  static async create(contractData: {
    user_id: number;
    filename?: string;
    nickname?: string;
    contractor_name?: string;
    project_name?: string;
    file_path?: string;
    extracted_text?: string;
  }): Promise<Contract> {
    try {
      const result = await query(
        `INSERT INTO contracts (user_id, filename, nickname, contractor_name, project_name, file_path, extracted_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          contractData.user_id,
          contractData.filename,
          contractData.nickname,
          contractData.contractor_name,
          contractData.project_name,
          contractData.file_path,
          contractData.extracted_text
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating contract:', error);
      throw new Error('Failed to create contract');
    }
  }

  /**
   * Get all contracts for a user (limit to 10 most recent)
   */
  static async findByUserId(userId: number): Promise<Contract[]> {
    try {
      const result = await query(
        `SELECT * FROM contracts 
         WHERE user_id = $1 
         ORDER BY uploaded_at DESC 
         LIMIT 10`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error finding contracts by user ID:', error);
      throw new Error('Failed to retrieve contracts');
    }
  }

  /**
   * Get a single contract by ID with its risk findings
   */
  static async findById(contractId: number): Promise<ContractWithRiskFindings | null> {
    try {
      // Get the contract
      const contractResult = await query(
        'SELECT * FROM contracts WHERE id = $1',
        [contractId]
      );

      if (contractResult.rows.length === 0) {
        return null;
      }

      const contract = contractResult.rows[0];

      // Get associated risk findings
      const riskFindingsResult = await query(
        `SELECT * FROM risk_findings 
         WHERE contract_id = $1 
         ORDER BY created_at DESC`,
        [contractId]
      );

      return {
        ...contract,
        risk_findings: riskFindingsResult.rows
      };
    } catch (error) {
      console.error('Error finding contract by ID:', error);
      throw new Error('Failed to retrieve contract');
    }
  }

  /**
   * Update contract analysis after analysis completes
   */
  static async updateAnalysis(
    contractId: number,
    analysisData: {
      risk_score?: 'HIGH' | 'MEDIUM' | 'LOW';
      analysis_completed?: boolean;
      risk_findings?: Array<{
        risk_type?: string;
        risk_level?: 'HIGH' | 'MEDIUM' | 'LOW';
        problematic_text?: string;
        explanation?: string;
      }>;
    }
  ): Promise<ContractWithRiskFindings | null> {
    try {
      // Start a transaction to ensure data consistency
      await query('BEGIN');

      // Update the contract
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 2;

      if (analysisData.risk_score !== undefined) {
        updateFields.push(`risk_score = $${paramIndex}`);
        updateValues.push(analysisData.risk_score);
        paramIndex++;
      }

      if (analysisData.analysis_completed !== undefined) {
        updateFields.push(`analysis_completed = $${paramIndex}`);
        updateValues.push(analysisData.analysis_completed);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        const contractResult = await query(
          `UPDATE contracts SET ${updateFields.join(', ')} 
           WHERE id = $1 
           RETURNING *`,
          [contractId, ...updateValues]
        );

        if (contractResult.rows.length === 0) {
          await query('ROLLBACK');
          return null;
        }
      }

      // Insert risk findings if provided
      if (analysisData.risk_findings && analysisData.risk_findings.length > 0) {
        // First, delete existing risk findings for this contract
        await query(
          'DELETE FROM risk_findings WHERE contract_id = $1',
          [contractId]
        );

        // Insert new risk findings
        for (const finding of analysisData.risk_findings) {
          await query(
            `INSERT INTO risk_findings (contract_id, risk_type, risk_level, problematic_text, explanation)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              contractId,
              finding.risk_type,
              finding.risk_level,
              finding.problematic_text,
              finding.explanation
            ]
          );
        }
      }

      // Commit the transaction
      await query('COMMIT');

      // Return the updated contract with risk findings
      return await this.findById(contractId);
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK');
      console.error('Error updating contract analysis:', error);
      throw new Error('Failed to update contract analysis');
    }
  }

  /**
   * Get contract by ID and user ID (for authorization)
   */
  static async findByIdAndUserId(contractId: number, userId: number): Promise<Contract | null> {
    try {
      const result = await query(
        'SELECT * FROM contracts WHERE id = $1 AND user_id = $2',
        [contractId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding contract by ID and user ID:', error);
      throw new Error('Failed to retrieve contract');
    }
  }

  /**
   * Delete a contract and its associated risk findings
   */
  static async delete(contractId: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM contracts WHERE id = $1',
        [contractId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw new Error('Failed to delete contract');
    }
  }

  /**
   * Update contract metadata (nickname, contractor_name, project_name)
   */
  static async updateMetadata(
    contractId: number,
    updates: {
      nickname?: string;
      contractor_name?: string;
      project_name?: string;
    }
  ): Promise<Contract | null> {
    try {
      const allowedFields = ['nickname', 'contractor_name', 'project_name'];
      const updateFields = Object.keys(updates)
        .filter(key => allowedFields.includes(key) && updates[key as keyof typeof updates] !== undefined)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      if (!updateFields) {
        return null;
      }

      const values = Object.keys(updates)
        .filter(key => allowedFields.includes(key) && updates[key as keyof typeof updates] !== undefined)
        .map(key => updates[key as keyof typeof updates]);

      const result = await query(
        `UPDATE contracts SET ${updateFields} 
         WHERE id = $1 
         RETURNING *`,
        [contractId, ...values]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating contract metadata:', error);
      throw new Error('Failed to update contract metadata');
    }
  }
}