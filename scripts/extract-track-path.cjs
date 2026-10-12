const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/circuits/data/f1-circuits.geojson', 'utf8'));

function getNormalizedPath(featureId) {
  const f = data.features.find(x => x.properties.id === featureId);
  if (!f) throw new Error('Not found: ' + featureId);
  const coords = f.geometry.coordinates;

  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const midLat = (minLat + maxLat) / 2;
  const latCos = Math.cos((midLat * Math.PI) / 180);

  const metricPoints = coords.map(([lon, lat]) => [
    (lon - minLon) * 111139 * latCos,
    (maxLat - lat) * 111139
  ]);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of metricPoints) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const maxDim = Math.max(rangeX, rangeY);

  // 归一化到 0.08 .. 0.92 居中
  const pad = 0.08;
  const avail = 1.0 - pad * 2;
  const scale = avail / maxDim;

  const offX = pad + (avail - rangeX * scale) / 2;
  const offY = pad + (avail - rangeY * scale) / 2;

  return metricPoints.map(([x, y]) => [
    Math.round((offX + (x - minX) * scale) * 1000) / 1000,
    Math.round((offY + (y - minY) * scale) * 1000) / 1000
  ]);
}

const bahrainPath = getNormalizedPath('bh-2002');
console.log('Bahrain points count:', bahrainPath.length);

const silverstonePath = getNormalizedPath('gb-1948');
console.log('Silverstone points count:', silverstonePath.length);

fs.writeFileSync('scripts/track-paths.json', JSON.stringify({
  bahrain: bahrainPath,
  silverstone: silverstonePath
}, null, 2));
