import React, { useState } from 'react';
import AnalysisStatus, { AnalysisStatusData } from './AnalysisStatus';

/**
 * Example component demonstrating how to use AnalysisStatus
 * This component shows various usage patterns and can be used for testing
 */
const AnalysisStatusExample: React.FC = () => {
  const [analysisId, setAnalysisId] = useState<string>('analysis-123');
  const [completedAnalyses, setCompletedAnalyses] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleAnalysisComplete = (id: string, status: AnalysisStatusData) => {
    console.log('Analysis completed:', { id, status });
    setCompletedAnalyses(prev => [...prev, id]);
    alert(`Analysis ${id} completed successfully!`);
  };

  const handleRetry = (id: string) => {
    console.log('Retrying analysis:', id);
    setRetryCount(prev => prev + 1);
    alert(`Retrying analysis ${id} (attempt ${retryCount + 1})`);
  };

  const generateNewAnalysisId = () => {
    const newId = `analysis-${Date.now()}`;
    setAnalysisId(newId);
    setCompletedAnalyses([]);
    setRetryCount(0);
  };

  const mockInitialStatus: AnalysisStatusData = {
    id: analysisId,
    state: 'queued',
    fileName: 'sample-contract.pdf',
    startedAt: new Date().toISOString()
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <h2 className="mb-4">Analysis Status Component Example</h2>
          
          {/* Controls */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Controls</h5>
              <div className="d-flex gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={generateNewAnalysisId}
                >
                  Start New Analysis
                </button>
                <span className="badge bg-info align-self-center">
                  Current ID: {analysisId}
                </span>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1">
                    <strong>Completed Analyses:</strong> {completedAnalyses.length}
                  </p>
                  {completedAnalyses.length > 0 && (
                    <ul className="list-unstyled">
                      {completedAnalyses.map(id => (
                        <li key={id}>
                          <small className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            {id}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="col-md-6">
                  <p className="mb-1">
                    <strong>Retry Count:</strong> {retryCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Status Component */}
          <div className="mb-4">
            <h5 className="mb-3">Live Analysis Status</h5>
            <AnalysisStatus
              analysisId={analysisId}
              initialStatus={mockInitialStatus}
              onAnalysisComplete={handleAnalysisComplete}
              onRetry={handleRetry}
              pollingInterval={3000}
              className="mb-3"
            />
          </div>

          {/* Multiple Status Examples */}
          <div className="mb-4">
            <h5 className="mb-3">Static Status Examples</h5>
            
            {/* Queued Status */}
            <div className="mb-3">
              <h6>Queued Status</h6>
              <AnalysisStatus
                analysisId="demo-queued"
                initialStatus={{
                  id: 'demo-queued',
                  state: 'queued',
                  fileName: 'contract-queued.pdf',
                  startedAt: new Date().toISOString()
                }}
                pollingInterval={0} // Disable polling for demo
              />
            </div>

            {/* In Progress Status */}
            <div className="mb-3">
              <h6>In Progress Status</h6>
              <AnalysisStatus
                analysisId="demo-progress"
                initialStatus={{
                  id: 'demo-progress',
                  state: 'in-progress',
                  progress: 65,
                  estimatedTimeRemaining: 180,
                  fileName: 'contract-progress.pdf',
                  startedAt: new Date().toISOString()
                }}
                pollingInterval={0} // Disable polling for demo
              />
            </div>

            {/* Completed Status */}
            <div className="mb-3">
              <h6>Completed Status</h6>
              <AnalysisStatus
                analysisId="demo-completed"
                initialStatus={{
                  id: 'demo-completed',
                  state: 'completed',
                  progress: 100,
                  fileName: 'contract-completed.pdf',
                  startedAt: new Date(Date.now() - 300000).toISOString(),
                  completedAt: new Date().toISOString()
                }}
                pollingInterval={0} // Disable polling for demo
              />
            </div>

            {/* Failed Status */}
            <div className="mb-3">
              <h6>Failed Status</h6>
              <AnalysisStatus
                analysisId="demo-failed"
                initialStatus={{
                  id: 'demo-failed',
                  state: 'failed',
                  errorMessage: 'Unable to parse PDF document. The file may be corrupted or password protected.',
                  fileName: 'contract-failed.pdf',
                  startedAt: new Date(Date.now() - 60000).toISOString()
                }}
                onRetry={(id) => alert(`Retry clicked for ${id}`)}
                pollingInterval={0} // Disable polling for demo
              />
            </div>
          </div>

          {/* Usage Information */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Usage Information</h5>
              <div className="mb-3">
                <h6>Features Demonstrated:</h6>
                <ul>
                  <li>Real-time status polling (every 3 seconds)</li>
                  <li>Progress bar with percentage display</li>
                  <li>Estimated time remaining calculation</li>
                  <li>Retry functionality for failed analyses</li>
                  <li>Success notifications via callback</li>
                  <li>Bootstrap styling and responsive design</li>
                  <li>TypeScript interfaces for type safety</li>
                </ul>
              </div>
              <div className="mb-3">
                <h6>Integration Notes:</h6>
                <ul>
                  <li>Replace the mock API calls with actual backend endpoints</li>
                  <li>Customize polling intervals based on your needs</li>
                  <li>Handle authentication and error cases appropriately</li>
                  <li>Consider using React Query or SWR for advanced caching</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisStatusExample;