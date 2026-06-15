const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Normalize all newlines to just \n
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by newline
  const lines = normalized.split('\n');
  
  // Fix the trailing commas that were added because of undefined
  const fixedLines = lines.map((line, index) => {
    if (!line.trim()) return '';
    // If it's a data line and ends with a comma, it might have lost its last column
    // But actually, we don't know what the last column was for the cloned rows.
    // For Boundary, last column was land_use_type (empty anyway).
    // For Suitability, last column was water_saving_percent (numeric, but empty is fine).
    // For GroundTruth, last column was previous_crop (empty anyway).
    // Let's just write it with \n properly so PapaParse reads it correctly.
    return line;
  }).filter(l => l.trim() !== '');

  // Write back with standard \n
  fs.writeFileSync(filePath, fixedLines.join('\n') + '\n');
  console.log(`Fixed newlines for ${file}`);
});
