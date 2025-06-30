import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UploadForm from '../components/upload/UploadForm';

interface LocationState {
  message?: string;
  type?: 'success' | 'error' | 'info';
}

const UploadPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notification, setNotification] = useState<LocationState | null>(null);

  // Handle success/error messages from navigation state
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setNotification(state);
      // Clear the navigation state to prevent showing the message again on refresh
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [location.state]);

  const handleUploadSuccess = () => {
    setNotification({
      message: 'Contract uploaded successfully! Redirecting to dashboard...',
      type: 'success'
    });
    
    // Redirect after a short delay to show the success message
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  const handleUploadError = (error: string) => {
    setNotification({
      message: error,
      type: 'error'
    });
    
    // Auto-hide error message after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/dashboard">
            <i className="bi bi-shield-check me-2"></i>
            ContractGuard
          </Link>
          
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <button
                className="btn btn-link nav-link dropdown-toggle text-white"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle me-1"></i>
                {user?.full_name || user?.email || 'User'}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <span className="dropdown-item-text">
                    <small className="text-muted">{user?.email}</small>
                  </span>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item" to="/dashboard">
                    <i className="bi bi-speedometer2 me-2"></i>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <button className="dropdown-item" onClick={logout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="container mt-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link to="/dashboard" className="text-decoration-none">
                <i className="bi bi-house-door me-1"></i>
                Dashboard
              </Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Upload Contract
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            {/* Page Header */}
            <div className="text-center mb-4">
              <h1 className="h3 mb-2">Upload New Contract</h1>
              <p className="text-muted">
                Upload your contract document for risk analysis and compliance review
              </p>
            </div>

            {/* Notification Alert */}
            {notification && (
              <div className={`alert alert-${notification.type === 'error' ? 'danger' : notification.type === 'success' ? 'success' : 'info'} alert-dismissible fade show`} role="alert">
                <i className={`bi ${notification.type === 'error' ? 'bi-exclamation-triangle-fill' : notification.type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} me-2`}></i>
                {notification.message}
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={dismissNotification}
                ></button>
              </div>
            )}

            {/* Upload Form Card */}
            <div className="card shadow-sm">
              <div className="card-header bg-white border-bottom">
                <div className="d-flex align-items-center">
                  <i className="bi bi-cloud-upload-fill text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
                  <h5 className="card-title mb-0">Contract Upload</h5>
                </div>
              </div>
              <div className="card-body p-4">
                <UploadForm 
                  onSuccess={handleUploadSuccess}
                  onError={handleUploadError}
                />
              </div>
            </div>

            {/* Help Section */}
            <div className="card mt-4">
              <div className="card-header bg-light">
                <h6 className="card-title mb-0">
                  <i className="bi bi-question-circle me-2"></i>
                  Upload Guidelines
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-semibold">Supported Formats</h6>
                    <ul className="list-unstyled">
                      <li><i className="bi bi-file-pdf text-danger me-2"></i>PDF documents only</li>
                      <li><i className="bi bi-hdd text-muted me-2"></i>Maximum file size: 10MB</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold">What Happens Next?</h6>
                    <ul className="list-unstyled">
                      <li><i className="bi bi-search text-primary me-2"></i>Document will be analyzed for risks</li>
                      <li><i className="bi bi-graph-up text-success me-2"></i>Risk score will be calculated</li>
                      <li><i className="bi bi-clipboard-check text-info me-2"></i>Detailed report will be generated</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;