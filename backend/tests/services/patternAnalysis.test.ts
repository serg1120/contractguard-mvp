import { PatternAnalysisService } from '../../src/services/patternAnalysisService';

describe('PatternAnalysisService', () => {
  describe('analyzeContract', () => {
    it('should detect pay-when-paid clauses', async () => {
      const contractText = `
        Payment to Subcontractor shall be made pay-when-paid, meaning 
        Contractor shall pay Subcontractor within seven days of receiving 
        payment from Owner.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].risk_type).toBe('PAYMENT_TERMS');
      expect(findings[0].risk_level).toBe('HIGH');
      expect(findings[0].explanation).toContain('pay-when-paid');
    });

    it('should detect unlimited liability clauses', async () => {
      const contractText = `
        Subcontractor agrees to indemnify and hold harmless Contractor 
        from any and all claims, damages, losses, and expenses without limitation.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].risk_type).toBe('LIABILITY');
      expect(findings[0].risk_level).toBe('HIGH');
      expect(findings[0].explanation).toContain('unlimited');
    });

    it('should detect short notice requirements', async () => {
      const contractText = `
        Subcontractor must provide written notice to Contractor within 24 hours 
        of any issue that may affect the project.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].risk_type).toBe('NOTICE_REQUIREMENTS');
      expect(findings[0].risk_level).toBe('MEDIUM');
      expect(findings[0].explanation).toContain('24-48 hours');
    });

    it('should detect no compensation for delays', async () => {
      const contractText = `
        In the event of delays, Subcontractor shall receive time extension only 
        with no compensation for delay costs.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].risk_type).toBe('DELAY_TERMS');
      expect(findings[0].risk_level).toBe('MEDIUM');
      expect(findings[0].explanation).toContain('delays');
    });

    it('should detect termination for convenience', async () => {
      const contractText = `
        Contractor reserves the right to terminate this Agreement for 
        convenience with fourteen days written notice.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].risk_type).toBe('TERMINATION');
      expect(findings[0].risk_level).toBe('MEDIUM');
      expect(findings[0].explanation).toContain('convenience');
    });

    it('should detect multiple risks in a single contract', async () => {
      const contractText = `
        This Agreement contains the following terms:
        1. Payment shall be made pay-when-paid within 7 days of Owner payment.
        2. Subcontractor must provide notice within 24 hours of any issues.
        3. Contractor may terminate for convenience at any time.
        4. Subcontractor liability is unlimited for all claims.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      expect(findings.length).toBeGreaterThanOrEqual(3);
      
      const riskTypes = findings.map(f => f.risk_type);
      expect(riskTypes).toContain('PAYMENT_TERMS');
      expect(riskTypes).toContain('NOTICE_REQUIREMENTS');
      expect(riskTypes).toContain('LIABILITY');
    });

    it('should not detect false positives in clean contracts', async () => {
      const contractText = `
        This Agreement provides for fair payment terms within 30 days.
        Either party may terminate for material breach with reasonable notice.
        Liability shall be limited to the contract value.
        Neither party may terminate without cause.
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      // Should not find any major risks
      const highRisks = findings.filter(f => f.risk_level === 'HIGH');
      expect(highRisks).toHaveLength(0);
    });

    it('should handle empty or invalid input', async () => {
      await expect(PatternAnalysisService.analyzeContract('')).rejects.toThrow();
      await expect(PatternAnalysisService.analyzeContract('   ')).rejects.toThrow();
    });

    it('should sort findings by risk level', async () => {
      const contractText = `
        Contractor may terminate for convenience (medium risk).
        Payment is contingent upon payment from Owner (high risk).
        Contract shall be governed by state law (low risk).
      `;

      const findings = await PatternAnalysisService.analyzeContract(contractText);
      
      // Should be sorted HIGH -> MEDIUM -> LOW
      let lastRiskOrder = 4;
      const riskOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      
      findings.forEach(finding => {
        const currentOrder = riskOrder[finding.risk_level!] || 0;
        expect(currentOrder).toBeLessThanOrEqual(lastRiskOrder);
        lastRiskOrder = currentOrder;
      });
    });
  });

  describe('getRiskPatterns', () => {
    it('should return all available risk patterns', () => {
      const patterns = PatternAnalysisService.getRiskPatterns();
      
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      
      // Check that each pattern has required properties
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('riskLevel');
        expect(pattern).toHaveProperty('riskType');
        expect(pattern).toHaveProperty('explanation');
      });
    });
  });

  describe('testPattern', () => {
    it('should test specific patterns against text', () => {
      const text = 'Payment shall be made pay-when-paid to subcontractor.';
      
      const result = PatternAnalysisService.testPattern(text, 'Pay-When-Paid Clause');
      expect(result).toBe(true);
    });

    it('should return false for non-matching patterns', () => {
      const text = 'Payment shall be made within 30 days.';
      
      const result = PatternAnalysisService.testPattern(text, 'Pay-When-Paid Clause');
      expect(result).toBe(false);
    });

    it('should throw error for non-existent patterns', () => {
      const text = 'Some contract text';
      
      expect(() => {
        PatternAnalysisService.testPattern(text, 'Non-Existent Pattern');
      }).toThrow();
    });
  });

  describe('getRiskStatistics', () => {
    it('should calculate risk statistics correctly', () => {
      const findings = [
        { risk_level: 'HIGH', risk_type: 'PAYMENT_TERMS' },
        { risk_level: 'HIGH', risk_type: 'LIABILITY' },
        { risk_level: 'MEDIUM', risk_type: 'TERMINATION' },
        { risk_level: 'LOW', risk_type: 'JURISDICTION' }
      ] as any[];

      const stats = PatternAnalysisService.getRiskStatistics(findings);
      
      expect(stats.total).toBe(4);
      expect(stats.byLevel.HIGH).toBe(2);
      expect(stats.byLevel.MEDIUM).toBe(1);
      expect(stats.byLevel.LOW).toBe(1);
      expect(stats.byType.PAYMENT_TERMS).toBe(1);
      expect(stats.byType.LIABILITY).toBe(1);
    });
  });
});