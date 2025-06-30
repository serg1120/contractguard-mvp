import OpenAI from 'openai';
import { RiskFinding } from '../models/Contract';

export interface OpenAIAnalysisResponse {
  findings: Array<{
    risk_type: string;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    problematic_text: string;
    explanation: string;
    recommendation?: string;
  }>;
  overall_assessment: string;
  key_recommendations: string[];
}

export class OpenAIAnalysisService {
  private static openai: OpenAI;

  /**
   * Initialize OpenAI client
   */
  private static initializeOpenAI(): void {
    if (!OpenAIAnalysisService.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
      }
      
      OpenAIAnalysisService.openai = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  /**
   * Analyze contract using OpenAI GPT
   */
  static async analyzeContract(contractText: string): Promise<RiskFinding[]> {
    if (!contractText || contractText.trim().length === 0) {
      throw new Error('Contract text is required for OpenAI analysis');
    }

    try {
      OpenAIAnalysisService.initializeOpenAI();

      // Truncate text if it's too long (GPT has token limits)
      const maxLength = 12000; // Conservative limit to stay within token limits
      const truncatedText = contractText.length > maxLength 
        ? contractText.substring(0, maxLength) + '...[truncated]'
        : contractText;

      const systemPrompt = `You are a legal expert specializing in contract analysis. Your task is to identify potential risks and problematic clauses in contracts from the perspective of a contractor or service provider.

Focus on identifying:
1. LIABILITY issues (unlimited liability, personal guarantees, broad indemnification)
2. PAYMENT issues (payment terms, late fees, scope creep)
3. INTELLECTUAL_PROPERTY issues (work ownership, licensing, confidentiality)
4. TERMINATION issues (termination rights, notice periods, penalties)
5. SCOPE issues (unclear deliverables, unlimited revisions, scope creep)
6. TIMELINE issues (unrealistic deadlines, penalties for delays)
7. COMPLIANCE issues (regulatory requirements, certification needs)
8. DISPUTE_RESOLUTION issues (jurisdiction, arbitration, legal costs)

For each risk identified, provide:
- risk_type: One of the categories above
- risk_level: HIGH, MEDIUM, or LOW
- problematic_text: The specific clause or text that presents the risk
- explanation: Why this presents a risk and potential consequences
- recommendation: How to address or mitigate this risk

Return your response as a JSON object with the following structure:
{
  "findings": [
    {
      "risk_type": "string",
      "risk_level": "HIGH|MEDIUM|LOW",
      "problematic_text": "string",
      "explanation": "string",
      "recommendation": "string"
    }
  ],
  "overall_assessment": "string",
  "key_recommendations": ["string"]
}

Be thorough but focus on the most significant risks. Prioritize findings that could have major financial or legal implications.`;

      const userPrompt = `Please analyze the following contract for potential risks and problematic clauses:

${truncatedText}`;

      console.log('Sending contract to OpenAI for analysis...');
      
      const completion = await OpenAIAnalysisService.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using the faster, cheaper model for this task
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent, focused analysis
        max_tokens: 2000, // Sufficient for detailed analysis
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response received from OpenAI');
      }

      console.log('Received response from OpenAI, parsing...');
      
      let analysisResponse: OpenAIAnalysisResponse;
      try {
        analysisResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseContent);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate the response structure
      if (!analysisResponse.findings || !Array.isArray(analysisResponse.findings)) {
        throw new Error('Invalid response structure from OpenAI');
      }

      // Convert OpenAI findings to RiskFinding format
      const riskFindings: RiskFinding[] = analysisResponse.findings.map(finding => ({
        contract_id: 0, // Will be set by the caller
        risk_type: finding.risk_type,
        risk_level: finding.risk_level,
        problematic_text: finding.problematic_text,
        explanation: finding.recommendation 
          ? `${finding.explanation}\n\nRecommendation: ${finding.recommendation}`
          : finding.explanation
      }));

      console.log(`OpenAI analysis completed. Found ${riskFindings.length} potential risks.`);
      return riskFindings;

    } catch (error) {
      console.error('Error during OpenAI analysis:', error);
      
      // Handle specific OpenAI errors
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('OpenAI API key not configured or invalid');
        } else if (error.message.includes('rate limit')) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        } else if (error.message.includes('quota')) {
          throw new Error('OpenAI quota exceeded. Please check your OpenAI account.');
        }
      }
      
      throw new Error('Failed to perform OpenAI analysis');
    }
  }

  /**
   * Analyze specific contract sections with focused prompts
   */
  static async analyzeSection(
    sectionText: string, 
    sectionType: 'payment' | 'liability' | 'termination' | 'scope' | 'ip' | 'general'
  ): Promise<RiskFinding[]> {
    if (!sectionText || sectionText.trim().length === 0) {
      throw new Error('Section text is required for analysis');
    }

    const sectionPrompts = {
      payment: 'Focus on payment terms, late fees, invoicing requirements, and payment-related risks.',
      liability: 'Focus on liability limitations, indemnification clauses, insurance requirements, and liability risks.',
      termination: 'Focus on termination clauses, notice requirements, penalties, and termination-related risks.',
      scope: 'Focus on scope of work, deliverables, change requests, and scope-related risks.',
      ip: 'Focus on intellectual property ownership, licensing, confidentiality, and IP-related risks.',
      general: 'Provide a general analysis of all potential risks in this section.'
    };

    try {
      OpenAIAnalysisService.initializeOpenAI();

      const systemPrompt = `You are a legal expert specializing in contract analysis. ${sectionPrompts[sectionType]}

Return your response as a JSON object with findings array containing risk_type, risk_level, problematic_text, and explanation.`;

      const completion = await OpenAIAnalysisService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this contract section: ${sectionText}` }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response received from OpenAI');
      }

      const analysisResponse = JSON.parse(responseContent);
      
      return analysisResponse.findings?.map((finding: any) => ({
        contract_id: 0,
        risk_type: finding.risk_type,
        risk_level: finding.risk_level,
        problematic_text: finding.problematic_text,
        explanation: finding.explanation
      })) || [];

    } catch (error) {
      console.error('Error during OpenAI section analysis:', error);
      throw new Error('Failed to perform OpenAI section analysis');
    }
  }

  /**
   * Get a quick risk assessment without detailed findings
   */
  static async getQuickAssessment(contractText: string): Promise<{
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    summary: string;
    topConcerns: string[];
  }> {
    try {
      OpenAIAnalysisService.initializeOpenAI();

      const maxLength = 8000;
      const truncatedText = contractText.length > maxLength 
        ? contractText.substring(0, maxLength) + '...[truncated]'
        : contractText;

      const systemPrompt = `You are a legal expert. Provide a quick risk assessment of this contract. Return a JSON object with:
- riskLevel: "HIGH", "MEDIUM", or "LOW" 
- summary: Brief overview of the contract's risk profile
- topConcerns: Array of the 3 most important concerns`;

      const completion = await OpenAIAnalysisService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Quick assessment of: ${truncatedText}` }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response received from OpenAI');
      }

      return JSON.parse(responseContent);

    } catch (error) {
      console.error('Error during OpenAI quick assessment:', error);
      throw new Error('Failed to perform quick assessment');
    }
  }

  /**
   * Check if OpenAI is properly configured
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Test OpenAI connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      OpenAIAnalysisService.initializeOpenAI();
      
      const completion = await OpenAIAnalysisService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });

      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}