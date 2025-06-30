import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AnalysisStatus } from '../components/analysis';
import { RiskReport } from '../components/report';
import {
  contractService,
  Contract,
  AnalysisStatus as AnalysisStatusType,
  AnalysisResults
} from '../services/contractService';

const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatusType | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch contract and analysis data
  const fetchData = useCallback(async () => {
    if (!id) {
      setError('No contract ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch contract with analysis status
      const contractWithAnalysis = await contractService.getContractWithAnalysis(id);
      setContract(contractWithAnalysis);

      // If there's an analysis, fetch its status
      if (contractWithAnalysis.analysisId) {
        const status = await contractService.getAnalysisStatus(contractWithAnalysis.analysisId);
        setAnalysisStatus(status);

        // If analysis is complete, fetch results
        if (status.status === 'completed') {
          const results = await contractService.getAnalysisResults(contractWithAnalysis.analysisId);
          setAnalysisResults(results);
        }
        // If analysis is in progress, start polling
        else if (status.status === 'in_progress' || status.status === 'pending') {
          startPolling(contractWithAnalysis.analysisId);
        }
      } else {
        // If no analysis exists, start one
        const analysisStatus = await contractService.analyzeContract(id);
        setAnalysisStatus(analysisStatus);
        startPolling(analysisStatus.id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Start polling for analysis status
  const startPolling = useCallback(async (analysisId: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    try {
      const completedStatus = await contractService.pollAnalysisStatus(analysisId, {
        maxAttempts: 120, // 10 minutes
        intervalMs: 5000, // 5 seconds
        onProgress: (status) => {
          setAnalysisStatus(status);
        }
      });
      
      // Once analysis is complete, fetch the results
      if (completedStatus.status === 'completed') {
        const results = await contractService.getAnalysisResults(analysisId);
        setAnalysisResults(results);
      }
    } catch (err) {
      console.error('Analysis polling failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsPolling(false);
    }
  }, [isPolling]);

  // Handle print functionality
  const handlePrint = useCallback(() => {
    const printContent = document.getElementById('risk-report');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Contract Risk Report - ${contract?.filename || 'Unknown'}</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
              <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
              <style>
                @media print {
                  .no-print { display: none !important; }
                  .card { border: 1px solid #dee2e6 !important; }
                  .card-header { background-color: #f8f9fa !important; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }, [contract?.filename]);

  // Handle share functionality
  const handleShare = useCallback(async () => {
    if (!analysisResults || !contract) return;

    const shareData = {
      title: `Contract Risk Report - ${contract.filename}`,
      text: `Risk Analysis Report for ${contract.filename}. Overall Risk: ${analysisResults.overallRiskLevel.level.toUpperCase()}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        );
        alert('Report link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback: copy to clipboard manually
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Report link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
        alert('Unable to share report. Please copy the URL manually.');
      }
    }
  }, [analysisResults, contract]);

  // Handle analysis cancellation
  const handleCancelAnalysis = useCallback(async () => {
    if (!analysisStatus) return;

    try {
      // Note: We'd need to implement cancelAnalysis in the service
      // For now, just stop polling
      setIsPolling(false);
      setError('Analysis cancelled');
    } catch (err) {
      console.error('Error cancelling analysis:', err);
      setError('Failed to cancel analysis');
    }
  }, [analysisStatus]);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-vh-100 bg-light">
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <Link className="navbar-brand" to="/dashboard">ContractGuard</Link>
          </div>
        </nav>
        <div className="container py-4">
          <div className="row">
            <div className="col-md-10 mx-auto">
              <div className="card">
                <div className="card-body text-center p-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h5>Loading contract data...</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-vh-100 bg-light">
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <Link className="navbar-brand" to="/dashboard">ContractGuard</Link>
          </div>
        </nav>
        <div className="container py-4">
          <div className="row">
            <div className="col-md-10 mx-auto">
              <div className="card">
                <div className="card-body p-5">
                  <div className="alert alert-danger">
                    <h5 className="alert-heading">Error</h5>
                    <p className="mb-0">{error}</p>
                  </div>
                  <div className="d-flex gap-2">
                    <Link to="/dashboard" className="btn btn-secondary">
                      Back to Dashboard
                    </Link>
                    <button 
                      className="btn btn-outline-primary" 
                      onClick={fetchData}
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/dashboard">ContractGuard</Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" to="/dashboard">
              <i className="bi bi-arrow-left me-1"></i>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            {/* Contract Info Header */}
            {contract && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h4 className="mb-1">{contract.filename}</h4>
                      <p className="text-muted mb-0">
                        Uploaded: {new Date(contract.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-md-4 text-end">
                      <span className={`badge fs-6 ${
                        contract.status === 'analyzed' ? 'bg-success' :
                        contract.status === 'processing' ? 'bg-warning' :
                        contract.status === 'error' ? 'bg-danger' : 'bg-secondary'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Status or Results */}
            {analysisStatus && !analysisResults && (
              <AnalysisStatus 
                status={analysisStatus}
                onCancel={handleCancelAnalysis}
              />
            )}

            {analysisResults && (
              <RiskReport 
                analysis={analysisResults}
                contractFilename={contract?.filename}
                onPrint={handlePrint}
                onShare={handleShare}
              />
            )}

            {/* Action Buttons */}
            <div className="card mt-4">
              <div className="card-body">
                <div className="d-flex gap-2 justify-content-between">
                  <Link to="/dashboard" className="btn btn-secondary">
                    <i className="bi bi-arrow-left me-1"></i>
                    Back to Dashboard
                  </Link>
                  
                  {analysisResults && (
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary" 
                        onClick={handlePrint}
                        type="button"
                      >
                        <i className="bi bi-printer me-1"></i>
                        Print Report
                      </button>
                      <button 
                        className="btn btn-outline-success" 
                        onClick={handleShare}
                        type="button"
                      >
                        <i className="bi bi-share me-1"></i>
                        Share Report
                      </button>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate(`/upload`)}
                        type="button"
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Analyze Another Contract
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;