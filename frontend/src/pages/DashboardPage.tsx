import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { contractService } from '../services/contractService';

interface Contract {
  id: number;
  nickname: string;
  contractor_name: string;
  risk_score: 'HIGH' | 'MEDIUM' | 'LOW';
  uploaded_at: string;
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await contractService.getContracts();
      setContracts(response.data || []);
    } catch (err) {
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeClass = (riskScore: string) => {
    switch (riskScore) {
      case 'HIGH':
        return 'bg-danger';
      case 'MEDIUM':
        return 'bg-warning';
      case 'LOW':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/dashboard">ContractGuard</Link>
          <div className="ms-auto">
            <span className="navbar-text me-3">
              Welcome, {user?.full_name || user?.email}
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <div className="row mb-4">
          <div className="col">
            <h1 className="h3">Dashboard</h1>
            {user?.company_name && (
              <p className="text-muted">{user.company_name}</p>
            )}
          </div>
          <div className="col-auto">
            <Link to="/upload" className="btn btn-primary">
              + Upload New Contract
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Recent Analyses</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-3">No contracts analyzed yet</p>
                <Link to="/upload" className="btn btn-primary">
                  Upload Your First Contract
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Contract Name</th>
                      <th>Contractor</th>
                      <th>Upload Date</th>
                      <th>Risk Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.nickname || 'Untitled Contract'}</td>
                        <td>{contract.contractor_name || 'N/A'}</td>
                        <td>{new Date(contract.uploaded_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${getRiskBadgeClass(contract.risk_score)}`}>
                            {contract.risk_score} RISK
                          </span>
                        </td>
                        <td>
                          <Link 
                            to={`/report/${contract.id}`} 
                            className="btn btn-sm btn-outline-primary"
                          >
                            View Report
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;