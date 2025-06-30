import React from 'react';
import { AnalysisResults, Finding, RiskLevel } from '../../services/contractService';

interface RiskReportProps {
  analysis: AnalysisResults;
  contractFilename?: string;
  onPrint?: () => void;
  onShare?: () => void;
}

const RiskReport: React.FC<RiskReportProps> = ({
  analysis,
  contractFilename,
  onPrint,
  onShare
}) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      case 'critical':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low':
        return 'bi-shield-check';
      case 'medium':
        return 'bi-exclamation-triangle';
      case 'high':
        return 'bi-exclamation-circle';
      case 'critical':
        return 'bi-x-circle';
      default:
        return 'bi-question-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="risk-report" id="risk-report">
      {/* Header Section */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h3 className="mb-0">Contract Risk Analysis Report</h3>
            {contractFilename && (
              <small className="opacity-75">{contractFilename}</small>
            )}
          </div>
          <div className="d-flex gap-2">
            {onPrint && (
              <button
                className="btn btn-outline-light btn-sm"
                onClick={onPrint}
                type="button"
              >
                <i className="bi bi-printer me-1"></i>
                Print
              </button>
            )}
            {onShare && (
              <button
                className="btn btn-outline-light btn-sm"
                onClick={onShare}
                type="button"
              >
                <i className="bi bi-share me-1"></i>
                Share
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <div className="d-flex align-items-center mb-2">
                <i className={`bi ${getRiskLevelIcon(analysis.overallRiskLevel.level)} text-${getRiskLevelColor(analysis.overallRiskLevel.level)} me-2`}></i>
                <h4 className={`mb-0 text-${getRiskLevelColor(analysis.overallRiskLevel.level)}`}>
                  Overall Risk: {analysis.overallRiskLevel.level.toUpperCase()}
                </h4>
              </div>
              <p className="text-muted mb-0">
                Risk Score: {analysis.overallRiskScore}/100
              </p>
              <p className="text-muted">
                {analysis.overallRiskLevel.description}
              </p>
            </div>
            <div className="col-md-4 text-end">
              <div className="text-muted small">
                Generated: {formatDate(analysis.generatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Executive Summary</h5>
        </div>
        <div className="card-body">
          <div className="row text-center">
            <div className="col-md-2">
              <div className="border rounded p-3">
                <div className="h4 mb-1">{analysis.summary.totalFindings}</div>
                <div className="text-muted small">Total Findings</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="border rounded p-3">
                <div className="h4 mb-1 text-danger">{analysis.summary.criticalFindings}</div>
                <div className="text-muted small">Critical</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="border rounded p-3">
                <div className="h4 mb-1 text-warning">{analysis.summary.highRiskFindings}</div>
                <div className="text-muted small">High Risk</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="border rounded p-3">
                <div className="h4 mb-1 text-info">{analysis.summary.mediumRiskFindings}</div>
                <div className="text-muted small">Medium Risk</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="border rounded p-3">
                <div className="h4 mb-1 text-success">{analysis.summary.lowRiskFindings}</div>
                <div className="text-muted small">Low Risk</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Findings Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Key Findings</h5>
        </div>
        <div className="card-body">
          {analysis.findings.length === 0 ? (
            <p className="text-muted">No significant findings identified.</p>
          ) : (
            <div className="accordion" id="findingsAccordion">
              {analysis.findings.map((finding, index) => (
                <div className="accordion-item" key={finding.id}>
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#finding-${index}`}
                      aria-expanded="false"
                    >
                      <div className="d-flex justify-content-between align-items-center w-100 me-3">
                        <div className="d-flex align-items-center">
                          <span className={`badge bg-${getRiskLevelColor(finding.riskLevel.level)} me-2`}>
                            {finding.riskLevel.level.toUpperCase()}
                          </span>
                          <span>{finding.title}</span>
                        </div>
                        <small className="text-muted">
                          Page {finding.location.page}
                          {finding.location.section && ` - ${finding.location.section}`}
                        </small>
                      </div>
                    </button>
                  </h2>
                  <div
                    id={`finding-${index}`}
                    className="accordion-collapse collapse"
                    data-bs-parent="#findingsAccordion"
                  >
                    <div className="accordion-body">
                      <div className="mb-3">
                        <h6>Description:</h6>
                        <p>{finding.description}</p>
                      </div>
                      {finding.recommendation && (
                        <div className="mb-3">
                          <h6>Recommendation:</h6>
                          <p className="text-info">{finding.recommendation}</p>
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-6">
                          <small className="text-muted">
                            <strong>Category:</strong> {finding.category}
                          </small>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted">
                            <strong>Risk Score:</strong> {finding.riskLevel.score}/100
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Terms Section */}
      {analysis.keyTerms.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Key Terms</h5>
          </div>
          <div className="card-body">
            <div className="row">
              {analysis.keyTerms.map((term, index) => (
                <div key={index} className="col-md-6 mb-3">
                  <div className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0">{term.term}</h6>
                      <span className={`badge bg-${term.importance === 'high' ? 'danger' : term.importance === 'medium' ? 'warning' : 'success'}`}>
                        {term.importance}
                      </span>
                    </div>
                    <p className="text-muted small mb-2">{term.definition}</p>
                    <small className="text-muted">
                      Page {term.location.page}
                      {term.location.section && ` - ${term.location.section}`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Obligations Section */}
      {analysis.obligations.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Key Obligations</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Party</th>
                    <th>Obligation</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.obligations.map((obligation, index) => (
                    <tr key={index}>
                      <td>
                        <span className={`badge bg-${obligation.party === 'client' ? 'primary' : obligation.party === 'counterparty' ? 'secondary' : 'info'}`}>
                          {obligation.party}
                        </span>
                      </td>
                      <td>{obligation.description}</td>
                      <td>
                        <span className={`badge bg-${obligation.priority === 'high' ? 'danger' : obligation.priority === 'medium' ? 'warning' : 'success'}`}>
                          {obligation.priority}
                        </span>
                      </td>
                      <td>{obligation.deadline || 'Not specified'}</td>
                      <td>
                        Page {obligation.location.page}
                        {obligation.location.section && ` - ${obligation.location.section}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {analysis.recommendations.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Recommendations</h5>
          </div>
          <div className="card-body">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="mb-4 border-start border-4 border-info ps-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-0">{recommendation.title}</h6>
                  <span className={`badge bg-${recommendation.priority === 'high' ? 'danger' : recommendation.priority === 'medium' ? 'warning' : 'success'}`}>
                    {recommendation.priority} priority
                  </span>
                </div>
                <p className="text-muted mb-2">{recommendation.description}</p>
                <small className="text-info">
                  <strong>Impact:</strong> {recommendation.impact}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskReport;