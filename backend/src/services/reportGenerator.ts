import { ContractWithRiskFindings, RiskFinding } from '../models/Contract';

export interface ReportData {
  contract: ContractWithRiskFindings;
  generatedAt?: Date;
  customTitle?: string;
}

export interface ReportOptions {
  includeExecutiveSummary?: boolean;
  includeDetailedFindings?: boolean;
  includeRecommendations?: boolean;
  customStyles?: string;
}

/**
 * Professional Report Generator Service
 * Generates comprehensive HTML reports for contract risk assessments
 */
export class ReportGenerator {
  /**
   * Generate a complete HTML report from contract data
   */
  static generateReport(
    reportData: ReportData,
    options: ReportOptions = {}
  ): string {
    const {
      includeExecutiveSummary = true,
      includeDetailedFindings = true,
      includeRecommendations = true,
      customStyles = ''
    } = options;

    const { contract, generatedAt = new Date(), customTitle } = reportData;

    // Validate required data
    if (!contract) {
      throw new Error('Contract data is required to generate report');
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.getReportTitle(contract, customTitle)}</title>
    <style>
        ${this.getBaseStyles()}
        ${customStyles}
    </style>
</head>
<body>
    <div class="report-container">
        ${this.generateHeader(contract, generatedAt)}
        ${this.generateContractSummary(contract)}
        ${includeExecutiveSummary ? this.generateExecutiveSummary(contract) : ''}
        ${includeDetailedFindings ? this.generateDetailedFindings(contract) : ''}
        ${includeRecommendations ? this.generateRecommendations(contract) : ''}
        ${this.generateFooter(generatedAt)}
    </div>
</body>
</html>`;

    return htmlContent;
  }

  /**
   * Generate report title
   */
  private static getReportTitle(contract: ContractWithRiskFindings, customTitle?: string): string {
    if (customTitle) return customTitle;
    
    const contractName = contract.nickname || contract.filename || 'Contract';
    return `Risk Assessment Report - ${contractName}`;
  }

  /**
   * Generate report header section
   */
  private static generateHeader(contract: ContractWithRiskFindings, generatedAt: Date): string {
    const contractName = contract.nickname || contract.filename || 'Unnamed Contract';
    
    return `
    <header class="report-header">
        <div class="header-content">
            <h1 class="report-title">Contract Risk Assessment Report</h1>
            <div class="contract-identifier">
                <h2>${this.escapeHtml(contractName)}</h2>
                ${contract.contractor_name ? `<p class="contractor">Contractor: ${this.escapeHtml(contract.contractor_name)}</p>` : ''}
                ${contract.project_name ? `<p class="project">Project: ${this.escapeHtml(contract.project_name)}</p>` : ''}
            </div>
        </div>
        <div class="report-meta">
            <p><strong>Generated:</strong> ${this.formatDate(generatedAt)}</p>
            <p><strong>Analysis Date:</strong> ${contract.created_at ? this.formatDate(new Date(contract.created_at)) : 'N/A'}</p>
        </div>
    </header>`;
  }

  /**
   * Generate contract summary section
   */
  private static generateContractSummary(contract: ContractWithRiskFindings): string {
    const riskScore = contract.risk_score || 'PENDING';
    const riskColor = this.getRiskColor(riskScore);
    const riskFindings = contract.risk_findings || [];
    const analysisStatus = contract.analysis_completed ? 'Completed' : 'In Progress';

    return `
    <section class="contract-summary">
        <h3>Contract Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <label>Overall Risk Score:</label>
                <span class="risk-badge risk-${riskScore.toLowerCase()}" style="background-color: ${riskColor}">
                    ${riskScore}
                </span>
            </div>
            <div class="summary-item">
                <label>Analysis Status:</label>
                <span class="status-badge ${analysisStatus.toLowerCase().replace(' ', '-')}">${analysisStatus}</span>
            </div>
            <div class="summary-item">
                <label>Risk Findings:</label>
                <span class="findings-count">${riskFindings.length} issues identified</span>
            </div>
            <div class="summary-item">
                <label>File Name:</label>
                <span>${this.escapeHtml(contract.filename || 'N/A')}</span>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate executive summary section
   */
  private static generateExecutiveSummary(contract: ContractWithRiskFindings): string {
    const riskFindings = contract.risk_findings || [];
    const highRiskCount = riskFindings.filter(f => f.risk_level === 'HIGH').length;
    const mediumRiskCount = riskFindings.filter(f => f.risk_level === 'MEDIUM').length;
    const lowRiskCount = riskFindings.filter(f => f.risk_level === 'LOW').length;

    const executiveSummary = this.generateExecutiveSummaryText(contract, {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount
    });

    return `
    <section class="executive-summary">
        <h3>Executive Summary</h3>
        <div class="summary-content">
            <p>${executiveSummary}</p>
            ${riskFindings.length > 0 ? `
            <div class="risk-distribution">
                <h4>Risk Distribution</h4>
                <div class="risk-stats">
                    ${highRiskCount > 0 ? `<div class="risk-stat high"><span class="count">${highRiskCount}</span> High Risk</div>` : ''}
                    ${mediumRiskCount > 0 ? `<div class="risk-stat medium"><span class="count">${mediumRiskCount}</span> Medium Risk</div>` : ''}
                    ${lowRiskCount > 0 ? `<div class="risk-stat low"><span class="count">${lowRiskCount}</span> Low Risk</div>` : ''}
                </div>
            </div>` : ''}
        </div>
    </section>`;
  }

  /**
   * Generate detailed risk findings section
   */
  private static generateDetailedFindings(contract: ContractWithRiskFindings): string {
    const riskFindings = contract.risk_findings || [];

    if (riskFindings.length === 0) {
      return `
      <section class="detailed-findings">
          <h3>Detailed Risk Analysis</h3>
          <div class="no-findings">
              <p>No specific risk findings were identified during the analysis.</p>
              ${contract.analysis_completed ? 
                '<p>The contract appears to have acceptable risk levels based on our assessment criteria.</p>' : 
                '<p>Analysis is still in progress. Check back later for detailed findings.</p>'
              }
          </div>
      </section>`;
    }

    // Group findings by risk level
    const groupedFindings = this.groupFindingsByRiskLevel(riskFindings);

    return `
    <section class="detailed-findings">
        <h3>Detailed Risk Analysis</h3>
        <div class="findings-content">
            ${Object.entries(groupedFindings).map(([riskLevel, findings]) => `
                <div class="risk-level-section">
                    <h4 class="risk-level-header ${riskLevel.toLowerCase()}">
                        ${riskLevel} Risk Issues (${findings.length})
                    </h4>
                    <div class="findings-list">
                        ${findings.map((finding, index) => this.generateFindingItem(finding, index + 1)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </section>`;
  }

  /**
   * Generate individual finding item
   */
  private static generateFindingItem(finding: RiskFinding, index: number): string {
    const riskColor = this.getRiskColor(finding.risk_level || 'MEDIUM');
    
    return `
    <div class="finding-item">
        <div class="finding-header">
            <span class="finding-number">${index}</span>
            <span class="finding-type">${this.escapeHtml(finding.risk_type || 'General Risk')}</span>
            <span class="finding-level" style="background-color: ${riskColor}">
                ${finding.risk_level || 'MEDIUM'}
            </span>
        </div>
        <div class="finding-content">
            ${finding.explanation ? `
                <div class="finding-explanation">
                    <h5>Issue Description:</h5>
                    <p>${this.escapeHtml(finding.explanation)}</p>
                </div>
            ` : ''}
            ${finding.problematic_text ? `
                <div class="finding-text">
                    <h5>Problematic Text:</h5>
                    <blockquote>${this.escapeHtml(finding.problematic_text)}</blockquote>
                </div>
            ` : ''}
        </div>
    </div>`;
  }

  /**
   * Generate recommendations section
   */
  private static generateRecommendations(contract: ContractWithRiskFindings): string {
    const recommendations = this.generateRecommendationsList(contract);

    return `
    <section class="recommendations">
        <h3>Recommendations</h3>
        <div class="recommendations-content">
            ${recommendations.length > 0 ? `
                <ol class="recommendations-list">
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ol>
            ` : `
                <p>Based on the current analysis, no specific recommendations are available at this time.</p>
            `}
            <div class="general-advice">
                <h4>General Advice</h4>
                <ul>
                    <li>Review all contract terms carefully with legal counsel before signing</li>
                    <li>Ensure all parties understand their obligations and responsibilities</li>
                    <li>Consider negotiating any terms that present unacceptable risk levels</li>
                    <li>Maintain clear communication channels throughout the contract period</li>
                </ul>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate report footer
   */
  private static generateFooter(generatedAt: Date): string {
    return `
    <footer class="report-footer">
        <div class="footer-content">
            <p><strong>Disclaimer:</strong> This automated risk assessment is for informational purposes only and should not replace professional legal advice. Always consult with qualified legal professionals before making contractual decisions.</p>
            <p class="generation-info">Report generated on ${this.formatDate(generatedAt)} by ContractGuard Risk Assessment System</p>
        </div>
    </footer>`;
  }

  /**
   * Generate executive summary text based on findings
   */
  private static generateExecutiveSummaryText(
    contract: ContractWithRiskFindings,
    riskCounts: { highRiskCount: number; mediumRiskCount: number; lowRiskCount: number }
  ): string {
    const { highRiskCount, mediumRiskCount, lowRiskCount } = riskCounts;
    const totalFindings = highRiskCount + mediumRiskCount + lowRiskCount;
    const contractName = contract.nickname || contract.filename || 'the contract';

    if (totalFindings === 0) {
      return `Our analysis of ${this.escapeHtml(contractName)} found no significant risk factors. The contract appears to follow standard practices and contains acceptable terms. However, we recommend reviewing all terms with legal counsel before execution.`;
    }

    let summary = `Our comprehensive analysis of ${this.escapeHtml(contractName)} identified ${totalFindings} potential risk ${totalFindings === 1 ? 'factor' : 'factors'}.`;

    if (highRiskCount > 0) {
      summary += ` ${highRiskCount} ${highRiskCount === 1 ? 'issue requires' : 'issues require'} immediate attention due to high risk potential.`;
    }

    if (mediumRiskCount > 0) {
      summary += ` ${mediumRiskCount} medium-risk ${mediumRiskCount === 1 ? 'item' : 'items'} should be carefully reviewed and potentially negotiated.`;
    }

    if (lowRiskCount > 0) {
      summary += ` ${lowRiskCount} low-risk ${lowRiskCount === 1 ? 'observation' : 'observations'} are noted for awareness.`;
    }

    const riskLevel = contract.risk_score || 'PENDING';
    summary += ` The overall contract risk assessment is ${riskLevel}.`;

    return summary;
  }

  /**
   * Generate recommendations based on risk findings
   */
  private static generateRecommendationsList(contract: ContractWithRiskFindings): string[] {
    const recommendations: string[] = [];
    const riskFindings = contract.risk_findings || [];
    
    const highRiskFindings = riskFindings.filter(f => f.risk_level === 'HIGH');
    const mediumRiskFindings = riskFindings.filter(f => f.risk_level === 'MEDIUM');

    if (highRiskFindings.length > 0) {
      recommendations.push('Address all high-risk issues immediately before contract execution');
      recommendations.push('Engage legal counsel to review and negotiate high-risk terms');
    }

    if (mediumRiskFindings.length > 0) {
      recommendations.push('Review medium-risk items and consider negotiating more favorable terms');
      recommendations.push('Ensure adequate insurance coverage for identified medium-risk areas');
    }

    // Add specific recommendations based on risk types
    const riskTypes = riskFindings.map(f => f.risk_type).filter(Boolean);
    const uniqueRiskTypes = [...new Set(riskTypes)];

    uniqueRiskTypes.forEach(riskType => {
      const typeRecommendation = this.getRecommendationForRiskType(riskType!);
      if (typeRecommendation && !recommendations.includes(typeRecommendation)) {
        recommendations.push(typeRecommendation);
      }
    });

    return recommendations;
  }

  /**
   * Get specific recommendations based on risk type
   */
  private static getRecommendationForRiskType(riskType: string): string | null {
    const riskTypeMapping: { [key: string]: string } = {
      'payment': 'Establish clear payment schedules and dispute resolution procedures',
      'liability': 'Review liability caps and insurance requirements carefully',
      'termination': 'Ensure termination clauses are balanced and provide adequate protection',
      'intellectual_property': 'Clarify intellectual property ownership and usage rights',
      'confidentiality': 'Strengthen confidentiality and non-disclosure provisions',
      'performance': 'Define clear performance metrics and remedies for non-performance',
      'compliance': 'Verify all regulatory compliance requirements are met',
      'force_majeure': 'Review force majeure clauses for adequate coverage of unforeseen events'
    };

    const normalizedRiskType = riskType.toLowerCase().replace(/[^a-z]/g, '');
    return riskTypeMapping[normalizedRiskType] || null;
  }

  /**
   * Group findings by risk level
   */
  private static groupFindingsByRiskLevel(findings: RiskFinding[]): { [key: string]: RiskFinding[] } {
    const grouped: { [key: string]: RiskFinding[] } = {
      'HIGH': [],
      'MEDIUM': [],
      'LOW': []
    };

    findings.forEach(finding => {
      const level = finding.risk_level || 'MEDIUM';
      if (grouped[level]) {
        grouped[level].push(finding);
      }
    });

    // Remove empty groups and sort by priority
    const result: { [key: string]: RiskFinding[] } = {};
    ['HIGH', 'MEDIUM', 'LOW'].forEach(level => {
      if (grouped[level].length > 0) {
        result[level] = grouped[level];
      }
    });

    return result;
  }

  /**
   * Get color for risk level
   */
  private static getRiskColor(riskLevel: string): string {
    const colors: { [key: string]: string } = {
      'HIGH': '#dc3545',
      'MEDIUM': '#fd7e14',
      'LOW': '#28a745',
      'PENDING': '#6c757d'
    };

    return colors[riskLevel] || colors['MEDIUM'];
  }

  /**
   * Format date for display
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get comprehensive CSS styles for professional report formatting
   */
  private static getBaseStyles(): string {
    return `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            min-height: 100vh;
        }

        /* Header Styles */
        .report-header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .header-content {
            margin-bottom: 1.5rem;
        }

        .report-title {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 1rem;
            text-align: center;
        }

        .contract-identifier h2 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            text-align: center;
        }

        .contract-identifier p {
            font-size: 1.1rem;
            opacity: 0.9;
            text-align: center;
            margin: 0.25rem 0;
        }

        .report-meta {
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 1rem;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .report-meta p {
            margin: 0;
            font-size: 0.95rem;
        }

        /* Section Styles */
        section {
            margin: 2rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e9ecef;
        }

        section:last-of-type {
            border-bottom: none;
        }

        h3 {
            font-size: 1.75rem;
            color: #2c3e50;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 3px solid #3498db;
        }

        h4 {
            font-size: 1.25rem;
            color: #34495e;
            margin: 1.5rem 0 1rem 0;
        }

        h5 {
            font-size: 1rem;
            color: #2c3e50;
            margin: 1rem 0 0.5rem 0;
            font-weight: 600;
        }

        /* Contract Summary Styles */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }

        .summary-item {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        .summary-item label {
            font-weight: 600;
            color: #2c3e50;
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-item span {
            font-size: 1.1rem;
            color: #333;
        }

        /* Badge Styles */
        .risk-badge, .status-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }

        .risk-badge.risk-high {
            background-color: #dc3545;
        }

        .risk-badge.risk-medium {
            background-color: #fd7e14;
        }

        .risk-badge.risk-low {
            background-color: #28a745;
        }

        .risk-badge.risk-pending {
            background-color: #6c757d;
        }

        .status-badge.completed {
            background-color: #28a745;
        }

        .status-badge.in-progress {
            background-color: #fd7e14;
        }

        .findings-count {
            font-weight: 600;
            color: #2c3e50;
        }

        /* Executive Summary Styles */
        .summary-content {
            font-size: 1.1rem;
            line-height: 1.7;
        }

        .risk-distribution {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .risk-stats {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }

        .risk-stat {
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 600;
        }

        .risk-stat.high {
            background-color: #dc3545;
        }

        .risk-stat.medium {
            background-color: #fd7e14;
        }

        .risk-stat.low {
            background-color: #28a745;
        }

        .risk-stat .count {
            font-size: 1.2rem;
            font-weight: 700;
        }

        /* Detailed Findings Styles */
        .no-findings {
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
            color: #6c757d;
        }

        .risk-level-section {
            margin-bottom: 2rem;
        }

        .risk-level-header {
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            margin-bottom: 1rem;
        }

        .risk-level-header.high {
            background-color: #dc3545;
        }

        .risk-level-header.medium {
            background-color: #fd7e14;
        }

        .risk-level-header.low {
            background-color: #28a745;
        }

        .findings-list {
            space-y: 1rem;
        }

        .finding-item {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .finding-header {
            background: #f8f9fa;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .finding-number {
            background: #3498db;
            color: white;
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .finding-type {
            font-weight: 600;
            color: #2c3e50;
            flex: 1;
            min-width: 150px;
        }

        .finding-level {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            color: white;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .finding-content {
            padding: 1.5rem;
        }

        .finding-explanation, .finding-text {
            margin-bottom: 1rem;
        }

        .finding-explanation p, .finding-text p {
            margin-bottom: 0.5rem;
        }

        blockquote {
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 1rem 1.5rem;
            margin: 0.5rem 0;
            font-style: italic;
            color: #555;
            border-radius: 0 4px 4px 0;
        }

        /* Recommendations Styles */
        .recommendations-list {
            margin: 1rem 0;
            padding-left: 2rem;
        }

        .recommendations-list li {
            margin-bottom: 0.75rem;
            font-size: 1.05rem;
            line-height: 1.6;
        }

        .general-advice {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }

        .general-advice ul {
            margin-top: 1rem;
            padding-left: 1.5rem;
        }

        .general-advice li {
            margin-bottom: 0.5rem;
        }

        /* Footer Styles */
        .report-footer {
            background: #f8f9fa;
            padding: 2rem;
            margin-top: 2rem;
            border-top: 1px solid #e9ecef;
        }

        .footer-content p {
            margin-bottom: 1rem;
            font-size: 0.9rem;
            color: #6c757d;
        }

        .generation-info {
            text-align: center;
            font-style: italic;
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
            }

            .report-container {
                box-shadow: none;
                max-width: none;
            }

            .finding-item {
                break-inside: avoid;
            }

            .risk-level-section {
                break-inside: avoid;
            }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .report-header {
                padding: 1.5rem;
            }

            .report-title {
                font-size: 2rem;
            }

            .contract-identifier h2 {
                font-size: 1.5rem;
            }

            section {
                margin: 1rem;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .finding-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .report-meta {
                flex-direction: column;
                gap: 0.5rem;
            }

            .risk-stats {
                flex-direction: column;
            }
        }
    `;
  }
}

/**
 * Utility functions for report generation
 */
export const ReportUtils = {
  /**
   * Generate a simple text summary from contract data
   */
  generateTextSummary(contract: ContractWithRiskFindings): string {
    const contractName = contract.nickname || contract.filename || 'Contract';
    const riskScore = contract.risk_score || 'PENDING';
    const findingsCount = contract.risk_findings?.length || 0;

    return `${contractName} - Risk Score: ${riskScore} - ${findingsCount} findings identified`;
  },

  /**
   * Validate contract data for report generation
   */
  validateReportData(contract: ContractWithRiskFindings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!contract) {
      errors.push('Contract data is required');
      return { isValid: false, errors };
    }

    if (!contract.id) {
      errors.push('Contract ID is required');
    }

    if (!contract.filename && !contract.nickname) {
      errors.push('Contract must have either a filename or nickname');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get risk level statistics from contract
   */
  getRiskStatistics(contract: ContractWithRiskFindings): {
    total: number;
    high: number;
    medium: number;
    low: number;
  } {
    const findings = contract.risk_findings || [];
    
    return {
      total: findings.length,
      high: findings.filter(f => f.risk_level === 'HIGH').length,
      medium: findings.filter(f => f.risk_level === 'MEDIUM').length,
      low: findings.filter(f => f.risk_level === 'LOW').length
    };
  }
};

export default ReportGenerator;