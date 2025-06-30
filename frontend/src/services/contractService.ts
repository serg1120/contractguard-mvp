import axios, { AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// TypeScript interfaces
export interface Contract {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'analyzed' | 'error';
  analysisId?: string;
}

export interface AnalysisStatus {
  id: string;
  contractId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
}

export interface Finding {
  id: string;
  type: 'clause' | 'term' | 'obligation' | 'risk';
  title: string;
  description: string;
  location: {
    page: number;
    section?: string;
    paragraph?: number;
  };
  riskLevel: RiskLevel;
  recommendation?: string;
  category: string;
}

export interface AnalysisResults {
  id: string;
  contractId: string;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highRiskFindings: number;
    mediumRiskFindings: number;
    lowRiskFindings: number;
  };
  findings: Finding[];
  keyTerms: Array<{
    term: string;
    definition: string;
    importance: 'high' | 'medium' | 'low';
    location: {
      page: number;
      section?: string;
    };
  }>;
  obligations: Array<{
    party: 'client' | 'counterparty' | 'both';
    description: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
    location: {
      page: number;
      section?: string;
    };
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
  generatedAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PollingOptions {
  maxAttempts?: number;
  intervalMs?: number;
  onProgress?: (status: AnalysisStatus) => void;
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to handle API errors
const handleApiError = (error: AxiosError): never => {
  if (error.response?.data) {
    const apiError = error.response.data as ApiError;
    throw new Error(apiError.message || 'An API error occurred');
  } else if (error.request) {
    throw new Error('Network error: Unable to reach the server');
  } else {
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

export const contractService = {
  // Existing contract management functions
  uploadContract: async (formData: FormData): Promise<Contract> => {
    try {
      const response = await axios.post(`${API_URL}/contracts/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        }
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  getContracts: async (): Promise<Contract[]> => {
    try {
      const response = await axios.get(`${API_URL}/contracts`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  getContract: async (id: string): Promise<Contract> => {
    try {
      const response = await axios.get(`${API_URL}/contracts/${id}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  getContractPDF: async (id: string): Promise<Blob> => {
    try {
      const response = await axios.get(`${API_URL}/contracts/${id}/pdf`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  // New analysis functions
  analyzeContract: async (id: string): Promise<AnalysisStatus> => {
    try {
      const response = await axios.post(`${API_URL}/contracts/${id}/analyze`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  getAnalysisStatus: async (id: string): Promise<AnalysisStatus> => {
    try {
      const response = await axios.get(`${API_URL}/analysis/${id}/status`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  getAnalysisResults: async (id: string): Promise<AnalysisResults> => {
    try {
      const response = await axios.get(`${API_URL}/analysis/${id}/results`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  downloadReport: async (id: string): Promise<Blob> => {
    try {
      const response = await axios.get(`${API_URL}/analysis/${id}/report`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  },

  // Real-time polling utilities
  pollAnalysisStatus: async (
    analysisId: string,
    options: PollingOptions = {}
  ): Promise<AnalysisStatus> => {
    const {
      maxAttempts = 60, // Default: 5 minutes with 5-second intervals
      intervalMs = 5000, // Default: 5 seconds
      onProgress
    } = options;

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempts++;

        try {
          const status = await contractService.getAnalysisStatus(analysisId);
          
          // Call progress callback if provided
          if (onProgress) {
            onProgress(status);
          }

          // Check if analysis is complete
          if (status.status === 'completed') {
            resolve(status);
            return;
          }

          // Check if analysis failed
          if (status.status === 'failed') {
            reject(new Error(status.error || 'Analysis failed'));
            return;
          }

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout: Analysis did not complete in time'));
            return;
          }

          // Continue polling
          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  },

  // Utility function to analyze contract and wait for completion
  analyzeContractAndWait: async (
    contractId: string,
    options: PollingOptions = {}
  ): Promise<AnalysisResults> => {
    try {
      // Start analysis
      const analysisStatus = await contractService.analyzeContract(contractId);
      
      // Poll for completion
      const completedStatus = await contractService.pollAnalysisStatus(
        analysisStatus.id,
        options
      );

      // Fetch and return results
      return await contractService.getAnalysisResults(completedStatus.id);
    } catch (error) {
      throw error;
    }
  },

  // Utility function to download report with proper filename
  downloadReportFile: async (analysisId: string, filename?: string): Promise<void> => {
    try {
      const blob = await contractService.downloadReport(analysisId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `contract-analysis-${analysisId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
  },

  // Utility function to get contract with analysis status
  getContractWithAnalysis: async (contractId: string): Promise<Contract & { analysisStatus?: AnalysisStatus }> => {
    try {
      const contract = await contractService.getContract(contractId);
      
      // If contract has an associated analysis, fetch its status
      if (contract.analysisId) {
        try {
          const analysisStatus = await contractService.getAnalysisStatus(contract.analysisId);
          return { ...contract, analysisStatus };
        } catch (error) {
          // If analysis status fetch fails, return contract without status
          console.warn('Failed to fetch analysis status:', error);
          return contract;
        }
      }
      
      return contract;
    } catch (error) {
      handleApiError(error as AxiosError);
    }
  }
};