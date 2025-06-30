const fs = require('fs');

const cleanContract = fs.readFileSync('test-contracts/clean-contract.txt', 'utf8');

const patterns = [
  /may\s+terminat(?:e|ion)\s+for\s+convenience/gi,
  /right\s+to\s+terminat(?:e|ion)\s+for\s+convenience/gi,
  /terminat(?:e|ion)\s+for\s+convenience\s+at\s+any\s+time/gi,
  /terminat(?:e|ion)\s+without\s+cause\s+upon/gi,
  /may\s+terminat(?:e|ion)\s+without\s+cause/gi,
  /reserves?\s+the\s+right\s+to\s+terminat(?:e|ion)/gi
];

const patternNames = [
  'may terminate for convenience',
  'right to terminate for convenience', 
  'terminate for convenience at any time',
  'terminate without cause upon',
  'may terminate without cause',
  'reserves the right to terminate'
];

console.log('Testing individual patterns against clean contract:');
patterns.forEach((pattern, i) => {
  const match = cleanContract.match(pattern);
  console.log(`${patternNames[i]}: ${match ? 'MATCH - ' + match[0] : 'NO MATCH'}`);
});

console.log('\nTermination section of clean contract:');
const termSection = cleanContract.match(/TERMINATION:[\s\S]*?(?=\n\n|\n[A-Z])/i);
if (termSection) {
  console.log(termSection[0]);
}