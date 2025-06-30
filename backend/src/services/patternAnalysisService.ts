import { RiskFinding } from '../models/Contract';

export interface RiskPattern {
  name: string;
  pattern: RegExp;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskType: string;
  explanation: string;
}

export class PatternAnalysisService {
  /**
   * Pre-defined risk patterns for contract analysis
   */
  private static readonly RISK_PATTERNS: RiskPattern[] = [
    // High Risk Patterns - Construction Specific
    {
      name: 'Pay-When-Paid Clause',
      pattern: /pay[\s-]*when[\s-]*paid|paid\s+if\s+paid|contingent\s+upon\s+payment|payment\s+subject\s+to\s+receipt|conditioned\s+upon\s+payment/gi,
      riskLevel: 'HIGH',
      riskType: 'PAYMENT_TERMS',
      explanation: 'Pay-when-paid clauses mean you only get paid if the general contractor receives payment from the owner. If the owner goes bankrupt or refuses to pay, you might never receive payment for your work.'
    },
    {
      name: 'Unlimited Liability',
      pattern: /unlimited liability|unlimited damages|no limit.*liability|without limitation|indemnify.*without.*limit|hold.*harmless.*without.*limitation/gi,
      riskLevel: 'HIGH',
      riskType: 'LIABILITY',
      explanation: 'Contract contains clauses that may expose you to unlimited financial liability, potentially exceeding the contract value by millions of dollars.'
    },
    {
      name: 'Personal Guarantee',
      pattern: /personal guarantee|personally liable|individual guarantee|personal responsibility/gi,
      riskLevel: 'HIGH',
      riskType: 'LIABILITY',
      explanation: 'Personal guarantee clauses make you personally responsible for business obligations.'
    },
    {
      name: 'Broad Indemnification',
      pattern: /indemnify.*harmless|defend.*indemnify|hold harmless.*indemnify/gi,
      riskLevel: 'HIGH',
      riskType: 'INDEMNIFICATION',
      explanation: 'Broad indemnification clauses may require you to cover extensive legal costs and damages.'
    },
    {
      name: 'Exclusive Rights',
      pattern: /exclusive rights|sole.*rights|exclusive.*license|exclusive.*use/gi,
      riskLevel: 'HIGH',
      riskType: 'INTELLECTUAL_PROPERTY',
      explanation: 'Exclusive rights clauses may limit your ability to use or license your work elsewhere.'
    },
    {
      name: 'Work for Hire',
      pattern: /work for hire|work made for hire|employee.*work product/gi,
      riskLevel: 'HIGH',
      riskType: 'INTELLECTUAL_PROPERTY',
      explanation: 'Work for hire clauses transfer ownership of your creative work to the client.'
    },

    // Medium Risk Patterns - Construction Specific
    {
      name: 'Short Notice Requirements',
      pattern: /within\s+24\s+hours|within\s+48\s+hours|2\s+days?\s+notice|notice.*within.*(?:24|48)\s+hours|immediate.*notice|same\s+day\s+notice/gi,
      riskLevel: 'MEDIUM',
      riskType: 'NOTICE_REQUIREMENTS',
      explanation: 'Short notice requirements (24-48 hours) may not provide sufficient time to respond to contract obligations, potentially resulting in default or penalties.'
    },
    {
      name: 'No Compensation for Delays',
      pattern: /no\s+compensation\s+for\s+delay|time\s+extension\s+only|no\s+payment.*delay|delay.*without.*compensation|no\s+damages.*delay/gi,
      riskLevel: 'MEDIUM',
      riskType: 'DELAY_TERMS',
      explanation: 'Clauses denying compensation for delays mean you bear the cost of project delays even when they are not your fault, potentially causing significant financial loss.'
    },
    {
      name: 'Termination for Convenience',
      pattern: /(?:contractor|owner|client|company).*may\s+terminat(?:e|ion)|right\s+to\s+terminat(?:e|ion)\s+for\s+convenience|terminat(?:e|ion)\s+for\s+convenience\s+at\s+any\s+time|terminat(?:e|ion)\s+without\s+cause\s+upon|reserves?\s+the\s+right\s+to\s+terminat(?:e|ion)|can\s+terminat(?:e|ion).*convenience/gi,
      riskLevel: 'MEDIUM',
      riskType: 'TERMINATION',
      explanation: 'Termination for convenience allows the other party to end the contract without cause, potentially leaving you without compensation for mobilization costs and lost profits.'
    },
    {
      name: 'Late Payment Penalties',
      pattern: /late.*payment.*penalty|overdue.*interest|penalty.*late/gi,
      riskLevel: 'MEDIUM',
      riskType: 'PAYMENT',
      explanation: 'Contract includes penalties for late payments that could increase costs.'
    },
    {
      name: 'Non-Compete Clause',
      pattern: /non-compete|not compete|covenant not to compete|restraint.*trade/gi,
      riskLevel: 'MEDIUM',
      riskType: 'RESTRICTIVE_COVENANT',
      explanation: 'Non-compete clauses may restrict your ability to work with similar clients or in the same industry.'
    },
    {
      name: 'Automatic Renewal',
      pattern: /automatic.*renewal|auto.*renew|automatically.*extend/gi,
      riskLevel: 'MEDIUM',
      riskType: 'TERMINATION',
      explanation: 'Automatic renewal clauses may lock you into contract extensions without explicit consent.'
    },
    {
      name: 'Limited Termination Rights',
      pattern: /may not.*terminate|cannot.*terminate|no right.*terminate/gi,
      riskLevel: 'MEDIUM',
      riskType: 'TERMINATION',
      explanation: 'Limited termination rights may make it difficult to exit the contract if needed.'
    },
    {
      name: 'Confidentiality Obligations',
      pattern: /confidential.*information|non-disclosure|proprietary.*information/gi,
      riskLevel: 'MEDIUM',
      riskType: 'CONFIDENTIALITY',
      explanation: 'Broad confidentiality obligations may restrict your ability to discuss or use information.'
    },
    {
      name: 'Assignment Restrictions',
      pattern: /may not.*assign|cannot.*assign|no.*assignment.*without.*consent/gi,
      riskLevel: 'MEDIUM',
      riskType: 'ASSIGNMENT',
      explanation: 'Assignment restrictions may limit your ability to transfer contract rights or delegate work.'
    },

    // Low Risk Patterns
    {
      name: 'Governing Law',
      pattern: /governed by.*law|governing law|laws of.*shall apply/gi,
      riskLevel: 'LOW',
      riskType: 'JURISDICTION',
      explanation: 'Contract specifies which jurisdiction\'s laws will govern the agreement.'
    },
    {
      name: 'Force Majeure',
      pattern: /force majeure|act of god|unforeseeable.*circumstances/gi,
      riskLevel: 'LOW',
      riskType: 'FORCE_MAJEURE',
      explanation: 'Force majeure clauses provide protection for unforeseeable events beyond your control.'
    },
    {
      name: 'Notice Requirements',
      pattern: /written notice|notice.*required|shall.*notify/gi,
      riskLevel: 'LOW',
      riskType: 'NOTICE',
      explanation: 'Contract specifies requirements for providing notice in various situations.'
    },
    {
      name: 'Dispute Resolution',
      pattern: /dispute resolution|arbitration|mediation.*dispute/gi,
      riskLevel: 'LOW',
      riskType: 'DISPUTE_RESOLUTION',
      explanation: 'Contract includes mechanisms for resolving disputes outside of court.'
    },
    {
      name: 'Severability',
      pattern: /severability|severable|invalid.*provision.*remain/gi,
      riskLevel: 'LOW',
      riskType: 'SEVERABILITY',
      explanation: 'Severability clauses ensure that invalid provisions don\'t void the entire contract.'
    }
  ];

  /**
   * Analyze contract text for risk patterns
   */
  static async analyzeContract(contractText: string): Promise<RiskFinding[]> {
    if (!contractText || contractText.trim().length === 0) {
      throw new Error('Contract text is required for pattern analysis');
    }

    const findings: RiskFinding[] = [];

    try {
      // Normalize text for better matching - preserve sentence structure
      const normalizedText = contractText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n') // Preserve paragraph breaks
        .trim();

      // Split into sentences for better context extraction
      const sentences = normalizedText.split(/[.!?]+/).filter(s => s.trim().length > 10);

      // Check each pattern
      for (const riskPattern of PatternAnalysisService.RISK_PATTERNS) {
        const matchedSentences = new Set<string>(); // Avoid duplicate findings from same sentence
        
        // Check pattern against full text
        const matches = normalizedText.match(riskPattern.pattern);
        
        if (matches) {
          const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
          
          for (const match of uniqueMatches) {
            // Find the sentence containing this match
            const matchingSentence = sentences.find(sentence => 
              sentence.toLowerCase().includes(match.toLowerCase())
            );
            
            if (matchingSentence && !matchedSentences.has(matchingSentence)) {
              matchedSentences.add(matchingSentence);
              
              // Get enhanced context - surrounding sentences
              const sentenceIndex = sentences.indexOf(matchingSentence);
              const contextSentences = [];
              
              // Add previous sentence for context
              if (sentenceIndex > 0) {
                contextSentences.push(sentences[sentenceIndex - 1]);
              }
              
              // Add the matching sentence
              contextSentences.push(matchingSentence);
              
              // Add next sentence for context
              if (sentenceIndex < sentences.length - 1) {
                contextSentences.push(sentences[sentenceIndex + 1]);
              }
              
              const context = contextSentences.join('. ').trim();
              
              // Enhance explanation with specific match
              const enhancedExplanation = `${riskPattern.explanation}\n\nSpecific concern: "${match.trim()}"`;

              const finding: RiskFinding = {
                contract_id: 0, // Will be set by the caller
                risk_type: riskPattern.riskType,
                risk_level: riskPattern.riskLevel,
                problematic_text: context.length > 500 ? context.substring(0, 500) + '...' : context,
                explanation: enhancedExplanation
              };

              findings.push(finding);
            }
          }
        }
      }

      // Remove duplicate findings (same risk type and similar text)
      const uniqueFindings = PatternAnalysisService.deduplicateFindings(findings);

      // Sort findings by risk level (HIGH -> MEDIUM -> LOW)
      uniqueFindings.sort((a, b) => {
        const riskOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return (riskOrder[b.risk_level!] || 0) - (riskOrder[a.risk_level!] || 0);
      });

      console.log(`Pattern analysis completed. Found ${uniqueFindings.length} unique potential risks.`);
      return uniqueFindings;

    } catch (error) {
      console.error('Error during pattern analysis:', error);
      throw new Error('Failed to perform pattern analysis');
    }
  }

  /**
   * Remove duplicate findings based on risk type and text similarity
   */
  private static deduplicateFindings(findings: RiskFinding[]): RiskFinding[] {
    const uniqueFindings: RiskFinding[] = [];
    const seenCombinations = new Set<string>();

    for (const finding of findings) {
      // Create a key based on risk type and first 100 characters of problematic text
      const key = `${finding.risk_type}_${finding.problematic_text?.substring(0, 100)}`;
      
      if (!seenCombinations.has(key)) {
        seenCombinations.add(key);
        uniqueFindings.push(finding);
      }
    }

    return uniqueFindings;
  }

  /**
   * Get available risk patterns (for testing or documentation purposes)
   */
  static getRiskPatterns(): RiskPattern[] {
    return [...PatternAnalysisService.RISK_PATTERNS];
  }

  /**
   * Test a specific pattern against text
   */
  static testPattern(text: string, patternName: string): boolean {
    const pattern = PatternAnalysisService.RISK_PATTERNS.find(p => p.name === patternName);
    if (!pattern) {
      throw new Error(`Pattern '${patternName}' not found`);
    }
    
    return pattern.pattern.test(text);
  }

  /**
   * Add custom risk pattern (for extensibility)
   */
  static addCustomPattern(pattern: RiskPattern): void {
    PatternAnalysisService.RISK_PATTERNS.push(pattern);
  }

  /**
   * Analyze specific sections of a contract
   */
  static async analyzeSections(contractSections: { [sectionName: string]: string }): Promise<{ [sectionName: string]: RiskFinding[] }> {
    const sectionResults: { [sectionName: string]: RiskFinding[] } = {};

    for (const [sectionName, sectionText] of Object.entries(contractSections)) {
      try {
        const findings = await PatternAnalysisService.analyzeContract(sectionText);
        sectionResults[sectionName] = findings;
      } catch (error) {
        console.error(`Error analyzing section ${sectionName}:`, error);
        sectionResults[sectionName] = [];
      }
    }

    return sectionResults;
  }

  /**
   * Get risk statistics from findings
   */
  static getRiskStatistics(findings: RiskFinding[]): {
    total: number;
    byLevel: { HIGH: number; MEDIUM: number; LOW: number };
    byType: { [type: string]: number };
  } {
    const stats = {
      total: findings.length,
      byLevel: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      byType: {} as { [type: string]: number }
    };

    findings.forEach(finding => {
      // Count by risk level
      if (finding.risk_level) {
        stats.byLevel[finding.risk_level]++;
      }

      // Count by risk type
      if (finding.risk_type) {
        stats.byType[finding.risk_type] = (stats.byType[finding.risk_type] || 0) + 1;
      }
    });

    return stats;
  }
}