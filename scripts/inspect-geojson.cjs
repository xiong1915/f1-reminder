const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/circuits/data/f1-circuits.geojson', 'utf8'));
data.features.forEach((f, idx) => {
  console.log(`${idx + 1}.`, JSON.stringify(f.properties));
});
