const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript version of the pattern service
// Note: This assumes the TypeScript has been compiled
// For development, you might need to run: npx tsc
// or use ts-node: npx ts-node test-pattern-validation.ts

async function testPatternValidation() {
  console.log('=== ContractGuard Pattern Validation Test ===\n');
  
  try {
    // Read test contracts
    const highRiskContract = fs.readFileSync(
      path.join(__dirname, 'test-contracts', 'high-risk-contract.txt'), 
      'utf8'
    );
    
    const mediumRiskContract = fs.readFileSync(
      path.join(__dirname, 'test-contracts', 'medium-risk-contract.txt'), 
      'utf8'
    );
    
    const cleanContract = fs.readFileSync(
      path.join(__dirname, 'test-contracts', 'clean-contract.txt'), 
      'utf8'
    );
    
    // Test specific patterns manually (since we can't import TS directly)
    console.log('1. TESTING HIGH-RISK CONTRACT');
    console.log('=====================================');
    
    // Pay-when-paid pattern test
    const payWhenPaidPattern = /pay[\s-]*when[\s-]*paid|paid\s+if\s+paid|contingent\s+upon\s+payment|payment\s+subject\s+to\s+receipt|conditioned\s+upon\s+payment/gi;
    const payWhenPaidMatch = highRiskContract.match(payWhenPaidPattern);
    console.log('✓ Pay-when-paid clause detected:', payWhenPaidMatch ? 'YES' : 'NO');
    if (payWhenPaidMatch) console.log('  Found:', payWhenPaidMatch[0]);
    
    // Unlimited liability pattern test
    const unlimitedLiabilityPattern = /unlimited liability|unlimited damages|no limit.*liability|without limitation|indemnify.*without.*limit|hold.*harmless.*without.*limitation/gi;
    const unlimitedLiabilityMatch = highRiskContract.match(unlimitedLiabilityPattern);
    console.log('✓ Unlimited liability detected:', unlimitedLiabilityMatch ? 'YES' : 'NO');
    if (unlimitedLiabilityMatch) console.log('  Found:', unlimitedLiabilityMatch[0]);
    
    // Short notice pattern test
    const shortNoticePattern = /within\s+24\s+hours|within\s+48\s+hours|2\s+days?\s+notice|notice.*within.*(?:24|48)\s+hours|immediate.*notice|same\s+day\s+notice/gi;
    const shortNoticeMatch = highRiskContract.match(shortNoticePattern);
    console.log('✓ Short notice requirements detected:', shortNoticeMatch ? 'YES' : 'NO');
    if (shortNoticeMatch) console.log('  Found:', shortNoticeMatch[0]);
    
    // No delay compensation pattern test
    const noDelayCompPattern = /no\s+compensation\s+for\s+delay|time\s+extension\s+only|no\s+payment.*delay|delay.*without.*compensation|no\s+damages.*delay/gi;
    const noDelayCompMatch = highRiskContract.match(noDelayCompPattern);
    console.log('✓ No delay compensation detected:', noDelayCompMatch ? 'YES' : 'NO');
    if (noDelayCompMatch) console.log('  Found:', noDelayCompMatch[0]);
    
    // Termination for convenience pattern test
    const termConveniencePattern = /(?:contractor|owner|client|company).*may\s+terminat(?:e|ion)|right\s+to\s+terminat(?:e|ion)\s+for\s+convenience|terminat(?:e|ion)\s+for\s+convenience\s+at\s+any\s+time|terminat(?:e|ion)\s+without\s+cause\s+upon|reserves?\s+the\s+right\s+to\s+terminat(?:e|ion)|can\s+terminat(?:e|ion).*convenience/gi;
    const termConvenienceMatch = highRiskContract.match(termConveniencePattern);
    console.log('✓ Termination for convenience detected:', termConvenienceMatch ? 'YES' : 'NO');
    if (termConvenienceMatch) console.log('  Found:', termConvenienceMatch[0]);
    
    console.log('\n2. TESTING MEDIUM-RISK CONTRACT');
    console.log('=====================================');
    
    // Test some patterns on medium risk contract
    const mediumShortNoticeMatch = mediumRiskContract.match(shortNoticePattern);
    console.log('✓ Short notice (48 hours) detected:', mediumShortNoticeMatch ? 'YES' : 'NO');
    if (mediumShortNoticeMatch) console.log('  Found:', mediumShortNoticeMatch[0]);
    
    const mediumNoDelayCompMatch = mediumRiskContract.match(noDelayCompPattern);
    console.log('✓ No delay compensation detected:', mediumNoDelayCompMatch ? 'YES' : 'NO');
    if (mediumNoDelayCompMatch) console.log('  Found:', mediumNoDelayCompMatch[0]);
    
    const mediumTermConvenienceMatch = mediumRiskContract.match(termConveniencePattern);
    console.log('✓ Termination for convenience detected:', mediumTermConvenienceMatch ? 'YES' : 'NO');
    if (mediumTermConvenienceMatch) console.log('  Found:', mediumTermConvenienceMatch[0]);
    
    console.log('\n3. TESTING CLEAN CONTRACT');
    console.log('=====================================');
    
    // Test that clean contract doesn't trigger major risk patterns
    const cleanPayWhenPaidMatch = cleanContract.match(payWhenPaidPattern);
    const cleanUnlimitedLiabilityMatch = cleanContract.match(unlimitedLiabilityPattern);
    const cleanShortNoticeMatch = cleanContract.match(shortNoticePattern);
    const cleanNoDelayCompMatch = cleanContract.match(noDelayCompPattern);
    const cleanTermConvenienceMatch = cleanContract.match(termConveniencePattern);
    
    console.log('✓ Pay-when-paid clause detected:', cleanPayWhenPaidMatch ? 'YES (UNEXPECTED!)' : 'NO (GOOD)');
    console.log('✓ Unlimited liability detected:', cleanUnlimitedLiabilityMatch ? 'YES (UNEXPECTED!)' : 'NO (GOOD)');
    console.log('✓ Short notice requirements detected:', cleanShortNoticeMatch ? 'YES (UNEXPECTED!)' : 'NO (GOOD)');
    console.log('✓ No delay compensation detected:', cleanNoDelayCompMatch ? 'YES (UNEXPECTED!)' : 'NO (GOOD)');
    console.log('✓ Termination for convenience detected:', cleanTermConvenienceMatch ? 'YES (UNEXPECTED!)' : 'NO (GOOD)');
    
    console.log('\n=== PATTERN VALIDATION SUMMARY ===');
    
    const highRiskPatterns = [
      payWhenPaidMatch,
      unlimitedLiabilityMatch,
      shortNoticeMatch,
      noDelayCompMatch,
      termConvenienceMatch
    ].filter(Boolean).length;
    
    const mediumRiskPatterns = [
      mediumShortNoticeMatch,
      mediumNoDelayCompMatch,
      mediumTermConvenienceMatch
    ].filter(Boolean).length;
    
    const cleanRiskPatterns = [
      cleanPayWhenPaidMatch,
      cleanUnlimitedLiabilityMatch,
      cleanShortNoticeMatch,
      cleanNoDelayCompMatch,
      cleanTermConvenienceMatch
    ].filter(Boolean).length;
    
    console.log(`High-risk contract: ${highRiskPatterns}/5 critical patterns detected`);
    console.log(`Medium-risk contract: ${mediumRiskPatterns}/3 risk patterns detected`);
    console.log(`Clean contract: ${cleanRiskPatterns}/5 risk patterns detected (should be 0)`);
    
    if (highRiskPatterns === 5 && mediumRiskPatterns >= 2 && cleanRiskPatterns === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Pattern detection is working correctly.');
    } else {
      console.log('\n⚠️  Some patterns may need adjustment.');
    }
    
  } catch (error) {
    console.error('Error running pattern validation:', error);
  }
}

// Run the test
testPatternValidation();