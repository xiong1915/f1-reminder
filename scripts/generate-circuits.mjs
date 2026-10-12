// scripts/generate-circuits.mjs
// 基于真实 f1-circuits.geojson (MIT License) 生成 40 条真实 F1 赛道矢量资产与权威元数据

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const geojsonPath = path.join(rootDir, 'lib', 'circuits', 'data', 'f1-circuits.geojson');
const circuitsDir = path.join(rootDir, 'public', 'circuits');
const metadataOutPath = path.join(rootDir, 'lib', 'circuits', 'metadata.ts');

if (!fs.existsSync(circuitsDir)) {
  fs.mkdirSync(circuitsDir, { recursive: true });
}

// 40 条赛道与标准化 circuitId、年份有效区间、中文名称和技术参数的权威映射
const CIRCUIT_DEF_MAP = {
  'au-1953': {
    circuitId: 'albert_park',
    layoutId: '2022-current',
    nameZh: '阿尔伯特公园街区赛道',
    nameEn: 'Albert Park Circuit',
    country: '澳大利亚',
    city: '墨尔本',
    validFrom: 2022,
    validTo: 2026,
    turns: 14,
    drsZones: 4,
    type: 'street',
    lapRecord: { time: '1:19.813', driver: 'Charles Leclerc', year: 2024 }
  },
  'bh-2002': {
    circuitId: 'bahrain',
    layoutId: 'grand-prix',
    nameZh: '巴林国际赛车场',
    nameEn: 'Bahrain International Circuit',
    country: '巴林',
    city: '萨基尔',
    validFrom: 2004,
    validTo: 2026,
    turns: 15,
    drsZones: 3,
    type: 'permanent',
    lapRecord: { time: '1:31.447', driver: 'Pedro de la Rosa', year: 2005 }
  },
  'cn-2004': {
    circuitId: 'shanghai',
    layoutId: 'grand-prix',
    nameZh: '上海国际赛车场',
    nameEn: 'Shanghai International Circuit',
    country: '中国',
    city: '上海',
    validFrom: 2004,
    validTo: 2026,
    turns: 16,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:32.238', driver: 'Michael Schumacher', year: 2004 }
  },
  'es-1991': {
    circuitId: 'catalunya',
    layoutId: '2023-current',
    nameZh: '加泰罗尼亚赛车场',
    nameEn: 'Circuit de Barcelona-Catalunya',
    country: '西班牙',
    city: '巴塞罗那',
    validFrom: 2023,
    validTo: 2026,
    turns: 14,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:16.330', driver: 'Max Verstappen', year: 2023 }
  },
  'mc-1929': {
    circuitId: 'monaco',
    layoutId: 'grand-prix',
    nameZh: '摩纳哥赛道',
    nameEn: 'Circuit de Monaco',
    country: '摩纳哥',
    city: '蒙特卡洛',
    validFrom: 1950,
    validTo: 2026,
    turns: 19,
    drsZones: 1,
    type: 'street',
    lapRecord: { time: '1:12.909', driver: 'Lewis Hamilton', year: 2021 }
  },
  'ca-1978': {
    circuitId: 'villeneuve',
    layoutId: 'grand-prix',
    nameZh: '吉尔斯·维伦纽夫赛道',
    nameEn: 'Circuit Gilles Villeneuve',
    country: '加拿大',
    city: '蒙特利尔',
    validFrom: 1978,
    validTo: 2026,
    turns: 14,
    drsZones: 2,
    type: 'street',
    lapRecord: { time: '1:13.078', driver: 'Valtteri Bottas', year: 2019 }
  },
  'fr-1969': {
    circuitId: 'paul_ricard',
    layoutId: 'grand-prix',
    nameZh: '保罗·里卡尔赛道',
    nameEn: 'Circuit Paul Ricard',
    country: '法国',
    city: '勒卡斯特莱',
    validFrom: 1971,
    validTo: 2022,
    turns: 15,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:32.740', driver: 'Sebastian Vettel', year: 2019 }
  },
  'at-1969': {
    circuitId: 'red_bull_ring',
    layoutId: 'grand-prix',
    nameZh: '红牛环赛道',
    nameEn: 'Red Bull Ring',
    country: '奥地利',
    city: '施皮尔贝格',
    validFrom: 1997,
    validTo: 2026,
    turns: 10,
    drsZones: 3,
    type: 'permanent',
    lapRecord: { time: '1:05.619', driver: 'Carlos Sainz', year: 2020 }
  },
  'gb-1948': {
    circuitId: 'silverstone',
    layoutId: '2010-current',
    nameZh: '银石赛道',
    nameEn: 'Silverstone Circuit',
    country: '英国',
    city: '银石',
    validFrom: 2010,
    validTo: 2026,
    turns: 18,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:27.097', driver: 'Max Verstappen', year: 2020 }
  },
  'de-1932': {
    circuitId: 'hockenheim',
    layoutId: '2002-current',
    nameZh: '霍根海姆赛道',
    nameEn: 'Hockenheimring',
    country: '德国',
    city: '霍根海姆',
    validFrom: 2002,
    validTo: 2019,
    turns: 17,
    drsZones: 3,
    type: 'permanent',
    lapRecord: { time: '1:13.780', driver: 'Kimi Räikkönen', year: 2004 }
  },
  'hu-1986': {
    circuitId: 'hungaroring',
    layoutId: 'grand-prix',
    nameZh: '亨格罗宁赛道',
    nameEn: 'Hungaroring',
    country: '匈牙利',
    city: '布达佩斯',
    validFrom: 1986,
    validTo: 2026,
    turns: 14,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:16.627', driver: 'Lewis Hamilton', year: 2020 }
  },
  'be-1925': {
    circuitId: 'spa',
    layoutId: 'grand-prix',
    nameZh: '斯帕-弗朗科尔尚赛道',
    nameEn: 'Circuit de Spa-Francorchamps',
    country: '比利时',
    city: '斯帕',
    validFrom: 1979,
    validTo: 2026,
    turns: 19,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:44.701', driver: 'Sergio Pérez', year: 2024 }
  },
  'it-1922': {
    circuitId: 'monza',
    layoutId: 'grand-prix',
    nameZh: '蒙扎国家赛车场',
    nameEn: 'Autodromo Nazionale Monza',
    country: '意大利',
    city: '蒙扎',
    validFrom: 2000,
    validTo: 2026,
    turns: 11,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:21.046', driver: 'Rubens Barrichello', year: 2004 }
  },
  'sg-2008': {
    circuitId: 'marina_bay',
    layoutId: '2023-current',
    nameZh: '滨海湾街区赛道',
    nameEn: 'Marina Bay Street Circuit',
    country: '新加坡',
    city: '新加坡',
    validFrom: 2023,
    validTo: 2026,
    turns: 19,
    drsZones: 4,
    type: 'street',
    lapRecord: { time: '1:34.486', driver: 'Daniel Ricciardo', year: 2024 }
  },
  'ru-2014': {
    circuitId: 'sochi',
    layoutId: 'grand-prix',
    nameZh: '索契赛道',
    nameEn: 'Sochi Autodrom',
    country: '俄罗斯',
    city: '索契',
    validFrom: 2014,
    validTo: 2021,
    turns: 18,
    drsZones: 2,
    type: 'street',
    lapRecord: { time: '1:35.761', driver: 'Lewis Hamilton', year: 2019 }
  },
  'jp-1962': {
    circuitId: 'suzuka',
    layoutId: 'grand-prix',
    nameZh: '铃鹿国际赛车场',
    nameEn: 'Suzuka International Racing Course',
    country: '日本',
    city: '铃鹿',
    validFrom: 1987,
    validTo: 2026,
    turns: 18,
    drsZones: 1,
    type: 'permanent',
    lapRecord: { time: '1:30.983', driver: 'Lewis Hamilton', year: 2019 }
  },
  'us-2012': {
    circuitId: 'americas',
    layoutId: 'grand-prix',
    nameZh: '美洲赛道',
    nameEn: 'Circuit of the Americas',
    country: '美国',
    city: '奥斯汀',
    validFrom: 2012,
    validTo: 2026,
    turns: 20,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:36.169', driver: 'Charles Leclerc', year: 2019 }
  },
  'mx-1962': {
    circuitId: 'rodriguez',
    layoutId: '2015-current',
    nameZh: '罗德里格斯兄弟赛道',
    nameEn: 'Autódromo Hermanos Rodríguez',
    country: '墨西哥',
    city: '墨西哥城',
    validFrom: 2015,
    validTo: 2026,
    turns: 17,
    drsZones: 3,
    type: 'permanent',
    lapRecord: { time: '1:17.774', driver: 'Valtteri Bottas', year: 2021 }
  },
  'br-1940': {
    circuitId: 'interlagos',
    layoutId: 'grand-prix',
    nameZh: '若泽·卡洛斯·佩斯赛道 (英特拉格斯)',
    nameEn: 'Autódromo José Carlos Pace (Interlagos)',
    country: '巴西',
    city: '圣保罗',
    validFrom: 1990,
    validTo: 2026,
    turns: 15,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:10.540', driver: 'Valtteri Bottas', year: 2018 }
  },
  'ae-2009': {
    circuitId: 'yas_marina',
    layoutId: '2021-current',
    nameZh: '亚斯码头赛道',
    nameEn: 'Yas Marina Circuit',
    country: '阿联酋',
    city: '阿布扎比',
    validFrom: 2021,
    validTo: 2026,
    turns: 16,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:26.103', driver: 'Max Verstappen', year: 2021 }
  },
  'it-1953': {
    circuitId: 'imola',
    layoutId: 'grand-prix',
    nameZh: '恩佐与迪诺·法拉利赛道 (伊莫拉)',
    nameEn: 'Autodromo Enzo e Dino Ferrari (Imola)',
    country: '意大利',
    city: '伊莫拉',
    validFrom: 1980,
    validTo: 2026,
    turns: 19,
    drsZones: 1,
    type: 'permanent',
    lapRecord: { time: '1:15.484', driver: 'Lewis Hamilton', year: 2020 }
  },
  'de-1927': {
    circuitId: 'nurburgring',
    layoutId: 'gp-strecke',
    nameZh: '纽博格林赛道 (GP 布局)',
    nameEn: 'Nürburgring GP-Strecke',
    country: '德国',
    city: '纽博格',
    validFrom: 1984,
    validTo: 2020,
    turns: 16,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:28.139', driver: 'Max Verstappen', year: 2020 }
  },
  'pt-2008': {
    circuitId: 'portimao',
    layoutId: 'grand-prix',
    nameZh: '阿尔加维国际赛道 (波尔蒂芒)',
    nameEn: 'Autódromo Internacional do Algarve',
    country: '葡萄牙',
    city: '波尔蒂芒',
    validFrom: 2020,
    validTo: 2021,
    turns: 15,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:18.750', driver: 'Lewis Hamilton', year: 2020 }
  },
  'it-1914': {
    circuitId: 'mugello',
    layoutId: 'grand-prix',
    nameZh: '穆杰罗赛道',
    nameEn: 'Autodromo Internazionale del Mugello',
    country: '意大利',
    city: '斯卡佩里亚',
    validFrom: 2020,
    validTo: 2020,
    turns: 15,
    drsZones: 1,
    type: 'permanent',
    lapRecord: { time: '1:18.833', driver: 'Lewis Hamilton', year: 2020 }
  },
  'my-1999': {
    circuitId: 'sepang',
    layoutId: 'grand-prix',
    nameZh: '雪邦国际赛车场',
    nameEn: 'Sepang International Circuit',
    country: '马来西亚',
    city: '雪邦',
    validFrom: 1999,
    validTo: 2017,
    turns: 15,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:34.080', driver: 'Sebastian Vettel', year: 2017 }
  },
  'tr-2005': {
    circuitId: 'istanbul',
    layoutId: 'grand-prix',
    nameZh: '伊斯坦布尔赛车场',
    nameEn: 'Intercity Istanbul Park',
    country: '土耳其',
    city: '伊斯坦布尔',
    validFrom: 2005,
    validTo: 2021,
    turns: 14,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:24.770', driver: 'Juan Pablo Montoya', year: 2005 }
  },
  'nl-1948': {
    circuitId: 'zandvoort',
    layoutId: '2020-current',
    nameZh: '赞德福特赛道',
    nameEn: 'Circuit Zandvoort',
    country: '荷兰',
    city: '赞德福特',
    validFrom: 2020,
    validTo: 2026,
    turns: 14,
    drsZones: 2,
    type: 'permanent',
    lapRecord: { time: '1:11.097', driver: 'Lewis Hamilton', year: 2021 }
  },
  'fr-1960': {
    circuitId: 'magny_cours',
    layoutId: 'grand-prix',
    nameZh: '马尼库尔赛道',
    nameEn: 'Circuit de Nevers Magny-Cours',
    country: '法国',
    city: '马尼库尔',
    validFrom: 1991,
    validTo: 2008,
    turns: 17,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:15.377', driver: 'Michael Schumacher', year: 2004 }
  },
  'pt-1972': {
    circuitId: 'estoril',
    layoutId: 'grand-prix',
    nameZh: '埃斯托里尔赛道',
    nameEn: 'Autódromo do Estoril',
    country: '葡萄牙',
    city: '埃斯托里尔',
    validFrom: 1984,
    validTo: 1996,
    turns: 13,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:13.041', driver: 'Damon Hill', year: 1993 }
  },
  'br-1977': {
    circuitId: 'jacarepagua',
    layoutId: 'grand-prix',
    nameZh: '雅卡雷帕瓜赛道 (内尔松·皮奎特)',
    nameEn: 'Autódromo Internacional Nelson Piquet',
    country: '巴西',
    city: '里约热内卢',
    validFrom: 1978,
    validTo: 1989,
    turns: 11,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:32.410', driver: 'Riccardo Patrese', year: 1989 }
  },
  'sa-2021': {
    circuitId: 'jeddah',
    layoutId: 'grand-prix',
    nameZh: '吉达滨海街区赛道',
    nameEn: 'Jeddah Corniche Circuit',
    country: '沙特阿拉伯',
    city: '吉达',
    validFrom: 2021,
    validTo: 2026,
    turns: 27,
    drsZones: 3,
    type: 'street',
    lapRecord: { time: '1:30.734', driver: 'Lewis Hamilton', year: 2021 }
  },
  'us-2022': {
    circuitId: 'miami',
    layoutId: 'grand-prix',
    nameZh: '迈阿密国际赛道',
    nameEn: 'Miami International Autodrome',
    country: '美国',
    city: '迈阿密',
    validFrom: 2022,
    validTo: 2026,
    turns: 19,
    drsZones: 3,
    type: 'street',
    lapRecord: { time: '1:29.708', driver: 'Max Verstappen', year: 2023 }
  },
  'qa-2004': {
    circuitId: 'losail',
    layoutId: 'grand-prix',
    nameZh: '罗塞尔国际赛车场',
    nameEn: 'Losail International Circuit',
    country: '卡塔尔',
    city: '卢赛尔',
    validFrom: 2021,
    validTo: 2026,
    turns: 16,
    drsZones: 1,
    type: 'permanent',
    lapRecord: { time: '1:23.196', driver: 'Max Verstappen', year: 2023 }
  },
  'es-2026': {
    circuitId: 'madring',
    layoutId: 'grand-prix',
    nameZh: '马德里街区赛道 (Madring)',
    nameEn: 'Circuito de Madring',
    country: '西班牙',
    city: '马德里',
    validFrom: 2026,
    validTo: 2035,
    turns: 20,
    drsZones: 2,
    type: 'street',
    lapRecord: null
  },
  'az-2016': {
    circuitId: 'baku',
    layoutId: 'grand-prix',
    nameZh: '巴库城市赛道',
    nameEn: 'Baku City Circuit',
    country: '阿塞拜疆',
    city: '巴库',
    validFrom: 2016,
    validTo: 2026,
    turns: 20,
    drsZones: 2,
    type: 'street',
    lapRecord: { time: '1:43.009', driver: 'Charles Leclerc', year: 2019 }
  },
  'us-2023': {
    circuitId: 'vegas',
    layoutId: 'grand-prix',
    nameZh: '拉斯维加斯街区赛道',
    nameEn: 'Las Vegas Street Circuit',
    country: '美国',
    city: '拉斯维加斯',
    validFrom: 2023,
    validTo: 2026,
    turns: 17,
    drsZones: 2,
    type: 'street',
    lapRecord: { time: '1:35.490', driver: 'Oscar Piastri', year: 2023 }
  },
  'us-1909': {
    circuitId: 'indianapolis',
    layoutId: 'f1-infield',
    nameZh: '印第安纳波利斯赛道 (F1 内场)',
    nameEn: 'Indianapolis Motor Speedway (F1)',
    country: '美国',
    city: '印第安纳波利斯',
    validFrom: 2000,
    validTo: 2007,
    turns: 13,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:10.399', driver: 'Rubens Barrichello', year: 2004 }
  },
  'ar-1952': {
    circuitId: 'galvez',
    layoutId: 'no6',
    nameZh: '加尔韦斯赛车场 (布宜诺斯艾利斯)',
    nameEn: 'Autódromo Oscar y Juan Gálvez',
    country: '阿根廷',
    city: '布宜诺斯艾利斯',
    validFrom: 1953,
    validTo: 1998,
    turns: 15,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:27.981', driver: 'Gerhard Berger', year: 1997 }
  },
  'za-1961': {
    circuitId: 'kyalami',
    layoutId: 'grand-prix',
    nameZh: '卡拉米赛道',
    nameEn: 'Kyalami Grand Prix Circuit',
    country: '南非',
    city: '约翰内斯堡',
    validFrom: 1967,
    validTo: 1993,
    turns: 16,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:17.578', driver: 'Nigel Mansell', year: 1992 }
  },
  'us-1956': {
    circuitId: 'watkins_glen',
    layoutId: 'grand-prix',
    nameZh: '沃特金斯格伦赛道',
    nameEn: 'Watkins Glen International',
    country: '美国',
    city: '沃特金斯格伦',
    validFrom: 1961,
    validTo: 1980,
    turns: 11,
    drsZones: 0,
    type: 'permanent',
    lapRecord: { time: '1:34.077', driver: 'Alan Jones', year: 1979 }
  }
};

/**
 * 局部公制度量投影 (考虑纬度余弦纠偏)，严格等比缩放到指定 viewBox
 */
function projectCoordinates(coords, width = 800, height = 600, padding = 50) {
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

  // 公制投影 (米)
  const metricPoints = coords.map(([lon, lat]) => [
    (lon - minLon) * 111139 * latCos,
    (maxLat - lat) * 111139 // SVG Y 轴自顶向下
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

  const availW = width - padding * 2;
  const availH = height - padding * 2;

  // 严格等比例等角缩放，杜绝形变
  const scale = Math.min(availW / rangeX, availH / rangeY);

  const offsetX = padding + (availW - rangeX * scale) / 2;
  const offsetY = padding + (availH - rangeY * scale) / 2;

  const svgPoints = metricPoints.map(([x, y]) => [
    Math.round((offsetX + (x - minX) * scale) * 10) / 10,
    Math.round((offsetY + (y - minY) * scale) * 10) / 10
  ]);

  return {
    svgPoints,
    startFinish: { x: svgPoints[0][0], y: svgPoints[0][1] },
    viewBox: `0 0 ${width} ${height}`
  };
}

/**
 * 生成多层专业赛道 SVG 字符串
 */
function generateSvgContent(circuitId, svgPoints, startFinish, viewBox) {
  const pathD = 'M ' + svgPoints.map(p => `${p[0]} ${p[1]}`).join(' L ') + ' Z';

  // 计算发车方向切线向量
  const p0 = svgPoints[0];
  const p1 = svgPoints[1] || svgPoints[0];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  // 垂直法线向量
  const nx = -dy / len;
  const ny = dx / len;
  const markLen = 14;
  const sfLineX1 = Math.round((p0[0] - nx * markLen) * 10) / 10;
  const sfLineY1 = Math.round((p0[1] - ny * markLen) * 10) / 10;
  const sfLineX2 = Math.round((p0[0] + nx * markLen) * 10) / 10;
  const sfLineY2 = Math.round((p0[1] + ny * markLen) * 10) / 10;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  <defs>
    <filter id="circuit-shadow-${circuitId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <linearGradient id="track-grad-${circuitId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>

  <!-- 1. 赛道底发光/阴影层 -->
  <path
    d="${pathD}"
    fill="none"
    stroke="#000000"
    stroke-width="18"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#circuit-shadow-${circuitId})"
    opacity="0.8"
  />

  <!-- 2. 跑道沥青层 (宽深色基底) -->
  <path
    d="${pathD}"
    fill="none"
    stroke="#1e2229"
    stroke-width="14"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- 3. 跑道次外缘 (中灰护栏边缘) -->
  <path
    d="${pathD}"
    fill="none"
    stroke="#333a45"
    stroke-width="8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- 4. 主赛道行驶线 (高对比白色轨迹线) -->
  <path
    id="track-path-${circuitId}"
    class="track-main"
    d="${pathD}"
    fill="none"
    stroke="url(#track-grad-${circuitId})"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- 5. 起终点线 (Start / Finish Line) -->
  <line
    x1="${sfLineX1}"
    y1="${sfLineY1}"
    x2="${sfLineX2}"
    y2="${sfLineY2}"
    stroke="#ff2d20"
    stroke-width="4.5"
    stroke-linecap="square"
  />

  <!-- 6. 起终点指示点 -->
  <circle
    cx="${startFinish.x}"
    cy="${startFinish.y}"
    r="5"
    fill="#ff2d20"
    stroke="#ffffff"
    stroke-width="2"
  />
</svg>`;
}

async function main() {
  console.log('读取本地真实 GeoJSON 数据集:', geojsonPath);
  const rawData = fs.readFileSync(geojsonPath, 'utf8');
  const geojson = JSON.parse(rawData);

  const metadataRegistry = {};

  for (const feature of geojson.features) {
    const featureId = feature.properties.id;
    const def = CIRCUIT_DEF_MAP[featureId];

    if (!def) {
      console.warn(`未映射的 GeoJSON 特征: ${featureId} (${feature.properties.Name})`);
      continue;
    }

    const { circuitId } = def;
    const coords = feature.geometry.coordinates;

    const { svgPoints, startFinish, viewBox } = projectCoordinates(coords, 800, 600, 50);

    const svgContent = generateSvgContent(circuitId, svgPoints, startFinish, viewBox);
    const svgFilename = `${circuitId}.svg`;
    const svgFilePath = path.join(circuitsDir, svgFilename);

    fs.writeFileSync(svgFilePath, svgContent, 'utf8');

    metadataRegistry[circuitId] = {
      circuitId,
      layoutId: def.layoutId,
      season: '2026',
      nameZh: def.nameZh,
      nameEn: def.nameEn,
      country: def.country,
      city: def.city,
      validFrom: def.validFrom,
      validTo: def.validTo,
      lengthKm: Math.round(feature.properties.length / 100) / 10,
      turns: def.turns,
      drsZones: def.drsZones,
      type: def.type,
      direction: def.direction || 'clockwise',
      lapRecord: def.lapRecord,
      svgFile: `/circuits/${svgFilename}`,
      viewBox,
      startFinish,
      geojsonSource: 'Tomislav Bacinger f1-circuits.geojson (MIT License)'
    };

    console.log(`✓ 已生成赛道资产: ${circuitId} (${def.nameZh}) -> ${svgFilename} [有效年代: ${def.validFrom}-${def.validTo || '至今'}]`);
  }

  // 写入 lib/circuits/metadata.ts
  const tsContent = `// lib/circuits/metadata.ts
// 基于真实 f1-circuits.geojson (MIT License) 生成的 40 条权威 F1 赛道元数据字典
// 主键为 circuitId，严格绑定真实地理坐标、年代有效范围及几何拓扑

import { CircuitMetadata } from './types';

export const CIRCUITS_METADATA: Record<string, CircuitMetadata> = ${JSON.stringify(metadataRegistry, null, 2)};
`;

  fs.writeFileSync(metadataOutPath, tsContent, 'utf8');
  console.log(`✓ 已更新元数据注册表: ${metadataOutPath} (共 ${Object.keys(metadataRegistry).length} 条赛道)`);
}

main().catch(err => {
  console.error('生成失败:', err);
  process.exit(1);
});
