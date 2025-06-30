import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: any;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response formatter utility for consistent API responses
 */
export class ResponseFormatter {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    meta?: any
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(meta && { meta })
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send success response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(message && { message }),
      meta: {
        pagination
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(res: Response, data: T, message?: string): void {
    ResponseFormatter.success(res, data, message || 'Resource created successfully', 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response, message?: string): void {
    res.status(204).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...(message && { message })
    });
  }

  /**
   * Format error response (used by error handler)
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: any
  ): void {
    const response = {
      success: false,
      error: {
        message,
        code: errorCode || 'INTERNAL_ERROR',
        statusCode,
        timestamp: new Date().toISOString(),
        ...(details && { details })
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Helper for contract upload responses
   */
  static contractUploaded(res: Response, contract: any, analysisStarted: boolean = false): void {
    const message = analysisStarted 
      ? 'Contract uploaded and analysis started successfully'
      : 'Contract uploaded successfully';

    ResponseFormatter.created(res, {
      contractId: contract.id,
      filename: contract.filename,
      nickname: contract.nickname,
      contractor_name: contract.contractor_name,
      project_name: contract.project_name,
      uploaded_at: contract.uploaded_at,
      analysisStarted
    }, message);
  }

  /**
   * Helper for analysis completion responses
   */
  static analysisCompleted(res: Response, analysis: any): void {
    ResponseFormatter.success(res, {
      contractId: analysis.contractId,
      riskScore: analysis.riskScore,
      riskFindings: analysis.riskFindings,
      analysisDate: analysis.analysisDate,
      totalRisks: analysis.totalRisks
    }, 'Contract analysis completed successfully');
  }

  /**
   * Helper for authentication responses
   */
  static authenticated(res: Response, user: any, token: string, isNewUser: boolean = false): void {
    const message = isNewUser 
      ? 'Account created and logged in successfully'
      : 'Logged in successfully';

    ResponseFormatter.success(res, {
      user: {
        id: user.id,
        email: user.email,
        company_name: user.company_name,
        full_name: user.full_name
      },
      token
    }, message, isNewUser ? 201 : 200);
  }

  /**
   * Helper for health check responses
   */
  static healthCheck(res: Response): void {
    ResponseFormatter.success(res, {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, 'ContractGuard API is running');
  }
}