import puppeteer from 'puppeteer';
import { Contract, RiskFinding } from '../models/Contract';

export interface ReportData {
  contract: Contract;
  riskFindings: RiskFinding[];
  generatedAt: Date;
  statistics: {
    totalFindings: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
}

export class ReportGenerationService {
  /**
   * Generate PDF report for contract analysis
   */
  static async generatePDFReport(
    contract: Contract,
    riskFindings: RiskFinding[]
  ): Promise<Buffer> {
    if (!contract) {
      throw new Error('Contract data is required for report generation');
    }

    try {
      // Prepare report data
      const reportData: ReportData = {
        contract,
        riskFindings: riskFindings || [],
        generatedAt: new Date(),
        statistics: {
          totalFindings: riskFindings?.length || 0,
          highRiskCount: riskFindings?.filter(f => f.risk_level === 'HIGH').length || 0,
          mediumRiskCount: riskFindings?.filter(f => f.risk_level === 'MEDIUM').length || 0,
          lowRiskCount: riskFindings?.filter(f => f.risk_level === 'LOW').length || 0,
        }
      };

      // Generate HTML content
      const htmlContent = ReportGenerationService.generateHTMLReport(reportData);

      // Launch Puppeteer and generate PDF
      console.log('Launching Puppeteer for PDF generation...');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '0.5in',
          bottom: '1in',
          left: '0.5in'
        }
      });

      await browser.close();
      
      console.log('PDF report generated successfully');
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generate HTML content for the report
   */
  private static generateHTMLReport(data: ReportData): string {
    const { contract, riskFindings, generatedAt, statistics } = data;

    // Group findings by risk level
    const groupedFindings = {
      HIGH: riskFindings.filter(f => f.risk_level === 'HIGH'),
      MEDIUM: riskFindings.filter(f => f.risk_level === 'MEDIUM'),
      LOW: riskFindings.filter(f => f.risk_level === 'LOW')
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Analysis Report - ${contract.filename}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            margin-bottom: 2rem;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .contract-info {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .contract-info h2 {
            color: #495057;
            margin-bottom: 1rem;
            border-bottom: 2px solid #007bff;
            padding-bottom: 0.5rem;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .info-item {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }

        .info-label {
            font-weight: bold;
            color: #6c757d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 1.1rem;
            margin-top: 0.25rem;
        }

        .risk-summary {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .risk-summary h2 {
            color: #495057;
            margin-bottom: 1rem;
        }

        .risk-score {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .risk-score.HIGH {
            background: #dc3545;
            color: white;
        }

        .risk-score.MEDIUM {
            background: #ffc107;
            color: #212529;
        }

        .risk-score.LOW {
            background: #28a745;
            color: white;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e9ecef;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #007bff;
        }

        .stat-label {
            color: #6c757d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .findings-section {
            margin-bottom: 2rem;
        }

        .findings-section h2 {
            color: #495057;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #007bff;
        }

        .risk-level-section {
            margin-bottom: 2rem;
        }

        .risk-level-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }

        .risk-level-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-weight: bold;
            font-size: 0.9rem;
            margin-right: 1rem;
        }

        .risk-level-badge.HIGH {
            background: #dc3545;
            color: white;
        }

        .risk-level-badge.MEDIUM {
            background: #ffc107;
            color: #212529;
        }

        .risk-level-badge.LOW {
            background: #28a745;
            color: white;
        }

        .finding-card {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .finding-card.HIGH {
            border-left: 4px solid #dc3545;
        }

        .finding-card.MEDIUM {
            border-left: 4px solid #ffc107;
        }

        .finding-card.LOW {
            border-left: 4px solid #28a745;
        }

        .finding-type {
            background: #e9ecef;
            color: #495057;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-bottom: 1rem;
        }

        .finding-text {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        .finding-explanation {
            color: #495057;
            line-height: 1.6;
        }

        .footer {
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            padding: 2rem;
            text-align: center;
            margin-top: 3rem;
            color: #6c757d;
        }

        .page-break {
            page-break-before: always;
        }

        @media print {
            .header {
                break-inside: avoid;
            }
            
            .finding-card {
                break-inside: avoid;
                margin-bottom: 1rem;
            }
            
            .risk-level-section {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Analysis Report</h1>
        <p>Generated on ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}</p>
    </div>

    <div class="container">
        <div class="contract-info">
            <h2>Contract Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Filename</div>
                    <div class="info-value">${contract.filename || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nickname</div>
                    <div class="info-value">${contract.nickname || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Contractor</div>
                    <div class="info-value">${contract.contractor_name || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Project</div>
                    <div class="info-value">${contract.project_name || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Uploaded</div>
                    <div class="info-value">${contract.uploaded_at ? new Date(contract.uploaded_at).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Analysis Date</div>
                    <div class="info-value">${generatedAt.toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <div class="risk-summary">
            <h2>Risk Assessment Summary</h2>
            <div style="margin-bottom: 1rem;">
                <strong>Overall Risk Score: </strong>
                <span class="risk-score ${contract.risk_score || 'LOW'}">${contract.risk_score || 'LOW'}</span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${statistics.totalFindings}</div>
                    <div class="stat-label">Total Findings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #dc3545">${statistics.highRiskCount}</div>
                    <div class="stat-label">High Risk</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #ffc107">${statistics.mediumRiskCount}</div>
                    <div class="stat-label">Medium Risk</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #28a745">${statistics.lowRiskCount}</div>
                    <div class="stat-label">Low Risk</div>
                </div>
            </div>
        </div>

        ${statistics.totalFindings > 0 ? `
        <div class="findings-section">
            <h2>Detailed Risk Findings</h2>
            
            ${groupedFindings.HIGH.length > 0 ? `
            <div class="risk-level-section">
                <div class="risk-level-header">
                    <span class="risk-level-badge HIGH">HIGH RISK</span>
                    <span>(${groupedFindings.HIGH.length} findings)</span>
                </div>
                ${groupedFindings.HIGH.map((finding, index) => `
                <div class="finding-card HIGH">
                    <div class="finding-type">${finding.risk_type?.replace(/_/g, ' ') || 'Unknown'}</div>
                    <div class="finding-explanation">${finding.explanation || 'No explanation provided'}</div>
                    ${finding.problematic_text ? `
                    <div class="finding-text">${ReportGenerationService.escapeHtml(finding.problematic_text)}</div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${groupedFindings.MEDIUM.length > 0 ? `
            <div class="risk-level-section">
                <div class="risk-level-header">
                    <span class="risk-level-badge MEDIUM">MEDIUM RISK</span>
                    <span>(${groupedFindings.MEDIUM.length} findings)</span>
                </div>
                ${groupedFindings.MEDIUM.map((finding, index) => `
                <div class="finding-card MEDIUM">
                    <div class="finding-type">${finding.risk_type?.replace(/_/g, ' ') || 'Unknown'}</div>
                    <div class="finding-explanation">${finding.explanation || 'No explanation provided'}</div>
                    ${finding.problematic_text ? `
                    <div class="finding-text">${ReportGenerationService.escapeHtml(finding.problematic_text)}</div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${groupedFindings.LOW.length > 0 ? `
            <div class="risk-level-section">
                <div class="risk-level-header">
                    <span class="risk-level-badge LOW">LOW RISK</span>
                    <span>(${groupedFindings.LOW.length} findings)</span>
                </div>
                ${groupedFindings.LOW.map((finding, index) => `
                <div class="finding-card LOW">
                    <div class="finding-type">${finding.risk_type?.replace(/_/g, ' ') || 'Unknown'}</div>
                    <div class="finding-explanation">${finding.explanation || 'No explanation provided'}</div>
                    ${finding.problematic_text ? `
                    <div class="finding-text">${ReportGenerationService.escapeHtml(finding.problematic_text)}</div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        ` : `
        <div class="findings-section">
            <h2>Analysis Results</h2>
            <div class="finding-card LOW">
                <p style="text-align: center; color: #28a745; font-size: 1.1rem;">
                    <strong>No significant risks identified in this contract.</strong>
                </p>
                <p style="text-align: center; margin-top: 1rem; color: #6c757d;">
                    This contract appears to have standard terms without major red flags. However, 
                    it's always recommended to have a legal professional review any contract before signing.
                </p>
            </div>
        </div>
        `}
    </div>

    <div class="footer">
        <p><strong>ContractGuard</strong> - Automated Contract Risk Analysis</p>
        <p style="margin-top: 0.5rem; font-size: 0.9rem;">
            This report is generated automatically and should not replace professional legal advice.
        </p>
    </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate a simple text report (fallback)
   */
  static generateTextReport(contract: Contract, riskFindings: RiskFinding[]): string {
    const reportDate = new Date().toLocaleDateString();
    const statistics = {
      totalFindings: riskFindings?.length || 0,
      highRiskCount: riskFindings?.filter(f => f.risk_level === 'HIGH').length || 0,
      mediumRiskCount: riskFindings?.filter(f => f.risk_level === 'MEDIUM').length || 0,
      lowRiskCount: riskFindings?.filter(f => f.risk_level === 'LOW').length || 0,
    };

    let report = `
CONTRACT ANALYSIS REPORT
Generated on: ${reportDate}

CONTRACT INFORMATION:
- Filename: ${contract.filename || 'N/A'}
- Nickname: ${contract.nickname || 'N/A'}
- Contractor: ${contract.contractor_name || 'N/A'}
- Project: ${contract.project_name || 'N/A'}
- Overall Risk Score: ${contract.risk_score || 'LOW'}

RISK SUMMARY:
- Total Findings: ${statistics.totalFindings}
- High Risk: ${statistics.highRiskCount}
- Medium Risk: ${statistics.mediumRiskCount}
- Low Risk: ${statistics.lowRiskCount}

DETAILED FINDINGS:
`;

    if (riskFindings && riskFindings.length > 0) {
      const groupedFindings = {
        HIGH: riskFindings.filter(f => f.risk_level === 'HIGH'),
        MEDIUM: riskFindings.filter(f => f.risk_level === 'MEDIUM'),
        LOW: riskFindings.filter(f => f.risk_level === 'LOW')
      };

      ['HIGH', 'MEDIUM', 'LOW'].forEach(level => {
        const findings = groupedFindings[level as keyof typeof groupedFindings];
        if (findings.length > 0) {
          report += `\n${level} RISK FINDINGS (${findings.length}):\n`;
          findings.forEach((finding, index) => {
            report += `\n${index + 1}. ${finding.risk_type?.replace(/_/g, ' ') || 'Unknown Risk'}\n`;
            report += `   ${finding.explanation || 'No explanation provided'}\n`;
            if (finding.problematic_text) {
              report += `   Problematic Text: "${finding.problematic_text.substring(0, 200)}${finding.problematic_text.length > 200 ? '...' : ''}"\n`;
            }
          });
        }
      });
    } else {
      report += '\nNo significant risks identified in this contract.\n';
    }

    report += `\n---\nContractGuard - Automated Contract Risk Analysis\nThis report should not replace professional legal advice.\n`;

    return report;
  }

  /**
   * Check if Puppeteer is available
   */
  static async isPuppeteerAvailable(): Promise<boolean> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      await browser.close();
      return true;
    } catch (error) {
      console.error('Puppeteer not available:', error);
      return false;
    }
  }
}