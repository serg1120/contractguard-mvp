import { RiskFinding } from '../models/Contract';

export interface RiskPattern {
  type: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  keywords: string[];
  contextKeywords: string[];
  description: string;
  explanation: string;
}

export interface RiskAnalysisResult {
  overallRiskScore: 'HIGH' | 'MEDIUM' | 'LOW';
  findings: Array<{
    risk_type: string;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    problematic_text: string;
    explanation: string;
  }>;
  summary: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    totalFindings: number;
  };
}

export class RiskAnalyzer {
  private static readonly RISK_PATTERNS: RiskPattern[] = [
    {
      type: 'Pay-When-Paid Clauses',
      level: 'HIGH',
      keywords: [
        'pay when paid',
        'paid when paid',
        'payment when payment',
        'pay if paid',
        'paid if paid',
        'payment if payment',
        'pay only when',
        'payment only when',
        'contingent upon payment',
        'subject to payment',
        'conditional payment',
        'payment conditioned'
      ],
      contextKeywords: [
        'owner',
        'client',
        'general contractor',
        'upstream',
        'receipt of payment',
        'received payment',
        'collection',
        'funds',
        'remittance'
      ],
      description: 'Clauses that make payment conditional on receiving payment from others',
      explanation: 'Pay-when-paid clauses shift the risk of non-payment from the hiring party to you. If the client doesn\'t pay the general contractor, you may not get paid either, even if you completed your work satisfactorily. This creates significant cash flow risks and is considered unfavorable to subcontractors.'
    },
    {
      type: 'Unlimited Liability Terms',
      level: 'HIGH',
      keywords: [
        'unlimited liability',
        'unlimited damages',
        'without limitation',
        'not limited to',
        'including but not limited to',
        'all damages',
        'any and all damages',
        'full liability',
        'complete liability',
        'total liability',
        'entire liability',
        'maximum liability',
        'liability cap',
        'limit of liability'
      ],
      contextKeywords: [
        'damages',
        'losses',
        'costs',
        'expenses',
        'claims',
        'liability',
        'responsible',
        'accountable',
        'indemnify',
        'hold harmless',
        'consequential',
        'indirect',
        'punitive',
        'special'
      ],
      description: 'Terms that expose you to unlimited financial liability',
      explanation: 'Unlimited liability terms can expose you to catastrophic financial losses that far exceed the contract value. Without liability caps, you could be responsible for all damages, including consequential and indirect damages, which could bankrupt your business. It\'s crucial to negotiate reasonable liability limitations.'
    },
    {
      type: 'Short Notice Requirements',
      level: 'MEDIUM',
      keywords: [
        'immediate notice',
        'immediately notify',
        'prompt notice',
        'promptly notify',
        'within 24 hours',
        'within 48 hours',
        'within 72 hours',
        'within 1 day',
        'within 2 days',
        'within 3 days',
        'same day',
        'next day',
        'business day',
        'written notice within',
        'oral notice within'
      ],
      contextKeywords: [
        'notice',
        'notification',
        'notify',
        'inform',
        'advise',
        'alert',
        'report',
        'claims',
        'changes',
        'delays',
        'problems',
        'issues',
        'defects',
        'default',
        'breach'
      ],
      description: 'Requirements for very short notice periods that may be difficult to meet',
      explanation: 'Short notice requirements can be problematic because they may not provide adequate time to assess situations, gather information, or provide proper notice. Failure to meet these tight deadlines could result in waived rights to claims, additional compensation, or other remedies, even if the underlying issue is valid.'
    },
    {
      type: 'No Compensation for Delays',
      level: 'MEDIUM',
      keywords: [
        'no compensation for delay',
        'no payment for delay',
        'delay damages waived',
        'waive delay claims',
        'no delay damages',
        'time is of the essence',
        'no extension',
        'no additional compensation',
        'no extra payment',
        'absorb delays',
        'own risk and expense',
        'liquidated damages'
      ],
      contextKeywords: [
        'delay',
        'delays',
        'schedule',
        'time',
        'completion',
        'performance',
        'weather',
        'unforeseen',
        'change orders',
        'owner caused',
        'client caused',
        'force majeure',
        'acts of god'
      ],
      description: 'Clauses that prevent compensation for delays, even those outside your control',
      explanation: 'No-compensation-for-delay clauses can be particularly harsh because they may prevent you from recovering costs for delays that are not your fault, such as owner-caused delays, weather delays, or unforeseen conditions. This shifts the financial burden of all delays to you, regardless of the cause.'
    },
    {
      type: 'Termination for Convenience',
      level: 'MEDIUM',
      keywords: [
        'terminate for convenience',
        'termination for convenience',
        'terminate without cause',
        'termination without cause',
        'terminate at will',
        'terminate at any time',
        'end this agreement',
        'cancel this contract',
        'discontinue work',
        'stop work',
        'suspend work'
      ],
      contextKeywords: [
        'convenience',
        'without cause',
        'any reason',
        'no reason',
        'sole discretion',
        'written notice',
        'days notice',
        'compensation',
        'payment',
        'work performed',
        'costs incurred',
        'demobilization'
      ],
      description: 'Provisions allowing termination without cause, potentially limiting your compensation',
      explanation: 'Termination-for-convenience clauses allow the other party to end the contract without cause, which can disrupt your business planning and cash flow. While some compensation is typically provided for work performed, you may not recover anticipated profits, mobilization costs, or other expenses. The key is ensuring fair compensation terms if termination occurs.'
    }
  ];

  /**
   * Analyze contract text for risk patterns
   */
  static async analyzeContract(contractText: string): Promise<RiskAnalysisResult> {
    if (!contractText || contractText.trim().length === 0) {
      throw new Error('Contract text is required for analysis');
    }

    const findings: RiskAnalysisResult['findings'] = [];
    const normalizedText = contractText.toLowerCase();

    // Analyze each risk pattern
    for (const pattern of this.RISK_PATTERNS) {
      const patternFindings = this.findPatternMatches(contractText, normalizedText, pattern);
      findings.push(...patternFindings);
    }

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(findings);

    // Generate summary
    const summary = this.generateSummary(findings);

    return {
      overallRiskScore,
      findings,
      summary
    };
  }

  /**
   * Find matches for a specific risk pattern
   */
  private static findPatternMatches(
    originalText: string,
    normalizedText: string,
    pattern: RiskPattern
  ): RiskAnalysisResult['findings'] {
    const findings: RiskAnalysisResult['findings'] = [];
    const foundKeywords = new Set<string>();

    // Search for keyword matches
    for (const keyword of pattern.keywords) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = [...originalText.matchAll(regex)];

      for (const match of matches) {
        if (match.index !== undefined) {
          // Check for context keywords nearby to improve accuracy
          const contextMatch = this.hasContextMatch(normalizedText, match.index, keyword.length, pattern.contextKeywords);
          
          if (contextMatch || pattern.contextKeywords.length === 0) {
            const problematicText = this.extractSurroundingText(originalText, match.index, keyword.length);
            
            // Avoid duplicate findings for the same text section
            const textKey = `${pattern.type}:${match.index}`;
            if (!foundKeywords.has(textKey)) {
              foundKeywords.add(textKey);
              
              findings.push({
                risk_type: pattern.type,
                risk_level: pattern.level,
                problematic_text: problematicText,
                explanation: pattern.explanation
              });
            }
          }
        }
      }
    }

    return findings;
  }

  /**
   * Check if context keywords appear near the matched keyword
   */
  private static hasContextMatch(
    normalizedText: string,
    matchIndex: number,
    keywordLength: number,
    contextKeywords: string[]
  ): boolean {
    if (contextKeywords.length === 0) {
      return true; // No context required
    }

    // Look 200 characters before and after the match
    const contextWindow = 200;
    const startIndex = Math.max(0, matchIndex - contextWindow);
    const endIndex = Math.min(normalizedText.length, matchIndex + keywordLength + contextWindow);
    const contextText = normalizedText.substring(startIndex, endIndex);

    // Check if any context keywords appear in the window
    return contextKeywords.some(contextKeyword => 
      contextText.includes(contextKeyword.toLowerCase())
    );
  }

  /**
   * Extract surrounding text for context
   */
  private static extractSurroundingText(
    originalText: string,
    matchIndex: number,
    keywordLength: number
  ): string {
    const contextLength = 150; // Characters before and after
    const startIndex = Math.max(0, matchIndex - contextLength);
    const endIndex = Math.min(originalText.length, matchIndex + keywordLength + contextLength);
    
    let extractedText = originalText.substring(startIndex, endIndex).trim();
    
    // Add ellipsis if we truncated
    if (startIndex > 0) {
      extractedText = '...' + extractedText;
    }
    if (endIndex < originalText.length) {
      extractedText = extractedText + '...';
    }

    // Clean up whitespace
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    return extractedText;
  }

  /**
   * Calculate overall risk score based on findings
   */
  private static calculateOverallRiskScore(findings: RiskAnalysisResult['findings']): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (findings.length === 0) {
      return 'LOW';
    }

    const highRiskCount = findings.filter(f => f.risk_level === 'HIGH').length;
    const mediumRiskCount = findings.filter(f => f.risk_level === 'MEDIUM').length;

    // If any high-risk patterns found, overall risk is high
    if (highRiskCount > 0) {
      return 'HIGH';
    }

    // If multiple medium-risk patterns found, escalate to high
    if (mediumRiskCount >= 3) {
      return 'HIGH';
    }

    // If any medium-risk patterns found, overall risk is medium
    if (mediumRiskCount > 0) {
      return 'MEDIUM';
    }

    // Only low-risk or no significant patterns found
    return 'LOW';
  }

  /**
   * Generate summary statistics
   */
  private static generateSummary(findings: RiskAnalysisResult['findings']): RiskAnalysisResult['summary'] {
    const highRiskCount = findings.filter(f => f.risk_level === 'HIGH').length;
    const mediumRiskCount = findings.filter(f => f.risk_level === 'MEDIUM').length;
    const lowRiskCount = findings.filter(f => f.risk_level === 'LOW').length;

    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalFindings: findings.length
    };
  }

  /**
   * Get available risk pattern types
   */
  static getRiskPatternTypes(): string[] {
    return this.RISK_PATTERNS.map(pattern => pattern.type);
  }

  /**
   * Get pattern details by type
   */
  static getPatternDetails(patternType: string): RiskPattern | null {
    return this.RISK_PATTERNS.find(pattern => pattern.type === patternType) || null;
  }

  /**
   * Validate analysis result format
   */
  static validateAnalysisResult(result: any): result is RiskAnalysisResult {
    return (
      result &&
      typeof result === 'object' &&
      ['HIGH', 'MEDIUM', 'LOW'].includes(result.overallRiskScore) &&
      Array.isArray(result.findings) &&
      result.findings.every((finding: any) => 
        finding &&
        typeof finding.risk_type === 'string' &&
        ['HIGH', 'MEDIUM', 'LOW'].includes(finding.risk_level) &&
        typeof finding.problematic_text === 'string' &&
        typeof finding.explanation === 'string'
      ) &&
      result.summary &&
      typeof result.summary.highRiskCount === 'number' &&
      typeof result.summary.mediumRiskCount === 'number' &&
      typeof result.summary.lowRiskCount === 'number' &&
      typeof result.summary.totalFindings === 'number'
    );
  }
}