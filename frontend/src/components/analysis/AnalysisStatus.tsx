import React from 'react';
import { AnalysisStatus as AnalysisStatusType } from '../../services/contractService';

interface AnalysisStatusProps {
  status: AnalysisStatusType;
  onCancel?: () => void;
}

const AnalysisStatus: React.FC<AnalysisStatusProps> = ({ status, onCancel }) => {
  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case 'pending':
        return 'text-warning';
      case 'in_progress':
        return 'text-info';
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const getStatusText = (statusType: string) => {
    switch (statusType) {
      case 'pending':
        return 'Analysis Queued';
      case 'in_progress':
        return 'Analyzing Contract';
      case 'completed':
        return 'Analysis Complete';
      case 'failed':
        return 'Analysis Failed';
      default:
        return 'Unknown Status';
    }
  };

  const getProgressText = (statusType: string, progress: number) => {
    if (statusType === 'pending') {
      return 'Waiting to start analysis...';
    }
    if (statusType === 'in_progress') {
      return `Processing contract... ${progress}%`;
    }
    if (statusType === 'completed') {
      return 'Contract analysis completed successfully.';
    }
    if (statusType === 'failed') {
      return status.error || 'An error occurred during analysis.';
    }
    return '';
  };

  return (
    <div className="card">
      <div className="card-body p-4">
        <div className="text-center">
          <div className="mb-4">
            {status.status === 'in_progress' && (
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            )}
            {status.status === 'pending' && (
              <div className="d-flex justify-content-center">
                <div className="spinner-grow text-warning" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {status.status === 'completed' && (
              <div className="text-success">
                <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem' }}></i>
              </div>
            )}
            {status.status === 'failed' && (
              <div className="text-danger">
                <i className="bi bi-x-circle-fill" style={{ fontSize: '3rem' }}></i>
              </div>
            )}
          </div>

          <h4 className={`mb-3 ${getStatusColor(status.status)}`}>
            {getStatusText(status.status)}
          </h4>

          <p className="text-muted mb-4">
            {getProgressText(status.status, status.progress)}
          </p>

          {status.status === 'in_progress' && (
            <div className="progress mb-3" style={{ height: '10px' }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${status.progress}%` }}
                aria-valuenow={status.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          )}

          <div className="text-muted small">
            <div>Started: {new Date(status.startedAt).toLocaleString()}</div>
            {status.completedAt && (
              <div>Completed: {new Date(status.completedAt).toLocaleString()}</div>
            )}
          </div>

          {status.status === 'in_progress' && onCancel && (
            <div className="mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={onCancel}
                type="button"
              >
                Cancel Analysis
              </button>
            </div>
          )}

          {status.status === 'failed' && (
            <div className="mt-4">
              <div className="alert alert-danger">
                <h6>Error Details:</h6>
                <small>{status.error || 'An unknown error occurred during analysis.'}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisStatus;