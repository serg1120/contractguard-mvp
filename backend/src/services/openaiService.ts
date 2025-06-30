import OpenAI from 'openai';
import { RiskFinding } from '../models/Contract';

/**
 * Configuration for OpenAI service
 */
interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * OpenAI response structure for contract analysis
 */
interface OpenAIAnalysisResponse {
  overall_risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  risk_findings: Array<{
    risk_type: string;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    problematic_text: string;
    explanation: string;
    confidence_score: number;
    suggestions?: string[];
  }>;
  summary: string;
  additional_insights?: string[];
}

/**
 * Structured analysis results
 */
export interface AIAnalysisResult {
  overall_risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  risk_findings: Array<{
    risk_type: string;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    problematic_text: string;
    explanation: string;
    confidence_score: number;
    suggestions?: string[];
  }>;
  summary: string;
  additional_insights: string[];
  processing_time_ms: number;
}

/**
 * OpenAI Service for Construction Contract Risk Analysis
 */
export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.config = {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3')
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Specialized prompts for construction contract risk analysis
   */
  private getAnalysisPrompt(contractText: string): string {
    return `You are an expert construction contract analyst. Analyze the following construction contract for potential risks and issues.

IMPORTANT: Your response MUST be valid JSON in the exact format specified below. Do not include any text before or after the JSON.

Focus on these key risk areas:
1. Payment terms and schedules
2. Change order procedures
3. Warranty and defect liability
4. Insurance and liability coverage
5. Project timeline and delays
6. Termination clauses
7. Dispute resolution mechanisms
8. Subcontractor management
9. Safety and compliance requirements
10. Force majeure and unforeseen circumstances
11. Indemnification clauses
12. Intellectual property rights
13. Material and labor cost escalation
14. Performance bonds and guarantees
15. Regulatory compliance and permits

CONTRACT TEXT TO ANALYZE:
${contractText}

Respond with JSON in this exact format:
{
  "overall_risk_level": "HIGH|MEDIUM|LOW",
  "confidence_score": 0.85,
  "risk_findings": [
    {
      "risk_type": "Payment Terms",
      "risk_level": "HIGH|MEDIUM|LOW",
      "problematic_text": "exact quote from contract",
      "explanation": "detailed explanation of the risk",
      "confidence_score": 0.90,
      "suggestions": ["suggestion 1", "suggestion 2"]
    }
  ],
  "summary": "Brief overall assessment of the contract's risk profile",
  "additional_insights": ["insight 1", "insight 2"]
}

Risk Level Guidelines:
- HIGH: Critical issues that could lead to significant financial loss, legal disputes, or project failure
- MEDIUM: Notable concerns that require attention and may impact project success
- LOW: Minor issues or standard clauses that pose minimal risk

Confidence Score Guidelines:
- 0.9-1.0: Very confident in the analysis
- 0.7-0.89: Confident but some uncertainty
- 0.5-0.69: Moderate confidence
- Below 0.5: Low confidence, may need human review`;
  }

  /**
   * Analyze a construction contract using OpenAI
   */
  async analyzeContract(contractText: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!contractText || contractText.trim().length === 0) {
        throw new Error('Contract text is required for analysis');
      }

      // Truncate very long contracts to avoid token limits
      const maxLength = 15000; // Approximate character limit
      const truncatedText = contractText.length > maxLength 
        ? contractText.substring(0, maxLength) + '\n\n[TEXT TRUNCATED DUE TO LENGTH]'
        : contractText;

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction contract analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: this.getAnalysisPrompt(truncatedText)
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      // Parse the JSON response
      let analysisResponse: OpenAIAnalysisResponse;
      try {
        analysisResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate response structure
      this.validateAnalysisResponse(analysisResponse);

      const processingTime = Date.now() - startTime;

      return {
        overall_risk_level: analysisResponse.overall_risk_level,
        confidence_score: analysisResponse.confidence_score,
        risk_findings: analysisResponse.risk_findings,
        summary: analysisResponse.summary,
        additional_insights: analysisResponse.additional_insights || [],
        processing_time_ms: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        console.error('OpenAI service error:', error.message);
        
        // Handle specific OpenAI errors
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        
        if (error.message.includes('insufficient_quota')) {
          throw new Error('OpenAI quota exceeded. Please check your billing settings.');
        }
        
        if (error.message.includes('timeout')) {
          throw new Error('OpenAI request timed out. Please try again.');
        }
        
        throw error;
      }
      
      throw new Error('Unexpected error during contract analysis');
    }
  }

  /**
   * Validate the structure of OpenAI analysis response
   */
  private validateAnalysisResponse(response: any): asserts response is OpenAIAnalysisResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format: expected object');
    }

    // Check required fields
    const requiredFields = ['overall_risk_level', 'confidence_score', 'risk_findings', 'summary'];
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate overall_risk_level
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(response.overall_risk_level)) {
      throw new Error('Invalid overall_risk_level: must be HIGH, MEDIUM, or LOW');
    }

    // Validate confidence_score
    if (typeof response.confidence_score !== 'number' || 
        response.confidence_score < 0 || 
        response.confidence_score > 1) {
      throw new Error('Invalid confidence_score: must be a number between 0 and 1');
    }

    // Validate risk_findings array
    if (!Array.isArray(response.risk_findings)) {
      throw new Error('Invalid risk_findings: must be an array');
    }

    // Validate each risk finding
    for (const finding of response.risk_findings) {
      if (!finding || typeof finding !== 'object') {
        throw new Error('Invalid risk finding: must be an object');
      }

      const requiredFindingFields = ['risk_type', 'risk_level', 'problematic_text', 'explanation', 'confidence_score'];
      for (const field of requiredFindingFields) {
        if (!(field in finding)) {
          throw new Error(`Missing required field in risk finding: ${field}`);
        }
      }

      if (!['HIGH', 'MEDIUM', 'LOW'].includes(finding.risk_level)) {
        throw new Error('Invalid risk_level in finding: must be HIGH, MEDIUM, or LOW');
      }

      if (typeof finding.confidence_score !== 'number' || 
          finding.confidence_score < 0 || 
          finding.confidence_score > 1) {
        throw new Error('Invalid confidence_score in finding: must be a number between 0 and 1');
      }
    }

    // Validate summary
    if (typeof response.summary !== 'string') {
      throw new Error('Invalid summary: must be a string');
    }
  }

  /**
   * Convert AI analysis results to database-compatible risk findings
   */
  convertToRiskFindings(analysisResult: AIAnalysisResult): Array<Omit<RiskFinding, 'id' | 'contract_id' | 'created_at'>> {
    return analysisResult.risk_findings.map(finding => ({
      risk_type: finding.risk_type,
      risk_level: finding.risk_level,
      problematic_text: finding.problematic_text,
      explanation: `${finding.explanation}${finding.suggestions?.length ? '\n\nSuggestions:\n• ' + finding.suggestions.join('\n• ') : ''}\n\nAI Confidence: ${Math.round(finding.confidence_score * 100)}%`
    }));
  }

  /**
   * Get service health and configuration info
   */
  getServiceInfo(): { 
    status: string; 
    model: string; 
    maxTokens: number; 
    temperature: number;
    hasApiKey: boolean;
  } {
    return {
      status: 'ready',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      hasApiKey: !!this.config.apiKey
    };
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'user', content: 'Respond with "OK" to test the connection.' }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (content) {
        return {
          success: true,
          message: 'OpenAI connection successful',
          latency
        };
      } else {
        return {
          success: false,
          message: 'No response from OpenAI'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export a singleton instance
export const openaiService = new OpenAIService();