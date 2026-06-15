const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

// Helper to parse CSV simply
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => {
    // Basic split, doesn't handle quoted commas, but our CSVs are simple
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
  return { headers, rows };
}

function writeCSV(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => row[h]).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

const CLONE_COUNT = 3;

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const { headers, rows } = parseCSV(content);
  
  const newRows = [...rows];
  
  for (const row of rows) {
    if (!row.parcel_id) continue;
    
    for (let c = 1; c <= CLONE_COUNT; c++) {
      const clone = { ...row };
      clone.parcel_id = `${row.parcel_id}_C${c}`;
      
      // If this is the boundary file, jitter the coordinates slightly
      if (clone.latitude && clone.longitude) {
        const lat = parseFloat(clone.latitude);
        const lon = parseFloat(clone.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          clone.latitude = (lat + (Math.random() - 0.5) * 0.04).toFixed(6);
          clone.longitude = (lon + (Math.random() - 0.5) * 0.04).toFixed(6);
        }
      }
      
      // If this is the ground truth or yield file, slightly jitter the yield/area
      if (clone.land_area_acres) {
        clone.land_area_acres = (parseFloat(clone.land_area_acres) * (0.8 + Math.random() * 0.4)).toFixed(2);
      }
      
      newRows.push(clone);
    }
  }
  
  writeCSV(filePath, headers, newRows);
  console.log(`Expanded ${file}: ${rows.length} -> ${newRows.length} rows`);
});
