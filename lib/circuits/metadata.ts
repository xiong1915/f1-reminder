// lib/circuits/metadata.ts
// 基于真实 f1-circuits.geojson (MIT License) 生成的 40 条权威 F1 赛道元数据字典
// 主键为 circuitId，严格绑定真实地理坐标、年代有效范围及几何拓扑

import { CircuitMetadata } from './types';

export const CIRCUITS_METADATA: Record<string, CircuitMetadata> = {
  "albert_park": {
    "circuitId": "albert_park",
    "layoutId": "2022-current",
    "season": "2026",
    "nameZh": "阿尔伯特公园街区赛道",
    "nameEn": "Albert Park Circuit",
    "country": "澳大利亚",
    "city": "墨尔本",
    "validFrom": 2022,
    "validTo": 2026,
    "lengthKm": 5.3,
    "turns": 14,
    "drsZones": 4,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:19.813",
      "driver": "Charles Leclerc",
      "year": 2024
    },
    "svgFile": "/circuits/albert_park.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 357.3,
      "y": 419.1
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "bahrain": {
    "circuitId": "bahrain",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "巴林国际赛车场",
    "nameEn": "Bahrain International Circuit",
    "country": "巴林",
    "city": "萨基尔",
    "validFrom": 2004,
    "validTo": 2026,
    "lengthKm": 5.4,
    "turns": 15,
    "drsZones": 3,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:31.447",
      "driver": "Pedro de la Rosa",
      "year": 2005
    },
    "svgFile": "/circuits/bahrain.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 242.2,
      "y": 287
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "shanghai": {
    "circuitId": "shanghai",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "上海国际赛车场",
    "nameEn": "Shanghai International Circuit",
    "country": "中国",
    "city": "上海",
    "validFrom": 2004,
    "validTo": 2026,
    "lengthKm": 5.5,
    "turns": 16,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:32.238",
      "driver": "Michael Schumacher",
      "year": 2004
    },
    "svgFile": "/circuits/shanghai.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 266.1,
      "y": 497.8
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "catalunya": {
    "circuitId": "catalunya",
    "layoutId": "2023-current",
    "season": "2026",
    "nameZh": "加泰罗尼亚赛车场",
    "nameEn": "Circuit de Barcelona-Catalunya",
    "country": "西班牙",
    "city": "巴塞罗那",
    "validFrom": 2023,
    "validTo": 2026,
    "lengthKm": 4.7,
    "turns": 14,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:16.330",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "svgFile": "/circuits/catalunya.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 517.5,
      "y": 273.3
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "monaco": {
    "circuitId": "monaco",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "摩纳哥赛道",
    "nameEn": "Circuit de Monaco",
    "country": "摩纳哥",
    "city": "蒙特卡洛",
    "validFrom": 1950,
    "validTo": 2026,
    "lengthKm": 3.3,
    "turns": 19,
    "drsZones": 1,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:12.909",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "svgFile": "/circuits/monaco.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 457.9,
      "y": 147.7
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "villeneuve": {
    "circuitId": "villeneuve",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "吉尔斯·维伦纽夫赛道",
    "nameEn": "Circuit Gilles Villeneuve",
    "country": "加拿大",
    "city": "蒙特利尔",
    "validFrom": 1978,
    "validTo": 2026,
    "lengthKm": 4.4,
    "turns": 14,
    "drsZones": 2,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:13.078",
      "driver": "Valtteri Bottas",
      "year": 2019
    },
    "svgFile": "/circuits/villeneuve.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 454.9,
      "y": 412
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "paul_ricard": {
    "circuitId": "paul_ricard",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "保罗·里卡尔赛道",
    "nameEn": "Circuit Paul Ricard",
    "country": "法国",
    "city": "勒卡斯特莱",
    "validFrom": 1971,
    "validTo": 2022,
    "lengthKm": 5.8,
    "turns": 15,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:32.740",
      "driver": "Sebastian Vettel",
      "year": 2019
    },
    "svgFile": "/circuits/paul_ricard.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 417.1,
      "y": 330.8
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "red_bull_ring": {
    "circuitId": "red_bull_ring",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "红牛环赛道",
    "nameEn": "Red Bull Ring",
    "country": "奥地利",
    "city": "施皮尔贝格",
    "validFrom": 1997,
    "validTo": 2026,
    "lengthKm": 4.3,
    "turns": 10,
    "drsZones": 3,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:05.619",
      "driver": "Carlos Sainz",
      "year": 2020
    },
    "svgFile": "/circuits/red_bull_ring.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 516.6,
      "y": 474.9
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "silverstone": {
    "circuitId": "silverstone",
    "layoutId": "2010-current",
    "season": "2026",
    "nameZh": "银石赛道",
    "nameEn": "Silverstone Circuit",
    "country": "英国",
    "city": "银石",
    "validFrom": 2010,
    "validTo": 2026,
    "lengthKm": 5.9,
    "turns": 18,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:27.097",
      "driver": "Max Verstappen",
      "year": 2020
    },
    "svgFile": "/circuits/silverstone.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 428.4,
      "y": 54.7
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "hockenheim": {
    "circuitId": "hockenheim",
    "layoutId": "2002-current",
    "season": "2026",
    "nameZh": "霍根海姆赛道",
    "nameEn": "Hockenheimring",
    "country": "德国",
    "city": "霍根海姆",
    "validFrom": 2002,
    "validTo": 2019,
    "lengthKm": 4.6,
    "turns": 17,
    "drsZones": 3,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:13.780",
      "driver": "Kimi Räikkönen",
      "year": 2004
    },
    "svgFile": "/circuits/hockenheim.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 107.1,
      "y": 404.3
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "hungaroring": {
    "circuitId": "hungaroring",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "亨格罗宁赛道",
    "nameEn": "Hungaroring",
    "country": "匈牙利",
    "city": "布达佩斯",
    "validFrom": 1986,
    "validTo": 2026,
    "lengthKm": 4.4,
    "turns": 14,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:16.627",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "svgFile": "/circuits/hungaroring.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 289.3,
      "y": 426.7
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "spa": {
    "circuitId": "spa",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "斯帕-弗朗科尔尚赛道",
    "nameEn": "Circuit de Spa-Francorchamps",
    "country": "比利时",
    "city": "斯帕",
    "validFrom": 1979,
    "validTo": 2026,
    "lengthKm": 7,
    "turns": 19,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:44.701",
      "driver": "Sergio Pérez",
      "year": 2024
    },
    "svgFile": "/circuits/spa.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 338.8,
      "y": 103
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "monza": {
    "circuitId": "monza",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "蒙扎国家赛车场",
    "nameEn": "Autodromo Nazionale Monza",
    "country": "意大利",
    "city": "蒙扎",
    "validFrom": 2000,
    "validTo": 2026,
    "lengthKm": 5.8,
    "turns": 11,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:21.046",
      "driver": "Rubens Barrichello",
      "year": 2004
    },
    "svgFile": "/circuits/monza.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 264.6,
      "y": 367.6
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "marina_bay": {
    "circuitId": "marina_bay",
    "layoutId": "2023-current",
    "season": "2026",
    "nameZh": "滨海湾街区赛道",
    "nameEn": "Marina Bay Street Circuit",
    "country": "新加坡",
    "city": "新加坡",
    "validFrom": 2023,
    "validTo": 2026,
    "lengthKm": 4.9,
    "turns": 19,
    "drsZones": 4,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:34.486",
      "driver": "Daniel Ricciardo",
      "year": 2024
    },
    "svgFile": "/circuits/marina_bay.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 734.7,
      "y": 245.8
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "sochi": {
    "circuitId": "sochi",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "索契赛道",
    "nameEn": "Sochi Autodrom",
    "country": "俄罗斯",
    "city": "索契",
    "validFrom": 2014,
    "validTo": 2021,
    "lengthKm": 5.8,
    "turns": 18,
    "drsZones": 2,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:35.761",
      "driver": "Lewis Hamilton",
      "year": 2019
    },
    "svgFile": "/circuits/sochi.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 686.1,
      "y": 205.4
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "suzuka": {
    "circuitId": "suzuka",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "铃鹿国际赛车场",
    "nameEn": "Suzuka International Racing Course",
    "country": "日本",
    "city": "铃鹿",
    "validFrom": 1987,
    "validTo": 2026,
    "lengthKm": 5.8,
    "turns": 18,
    "drsZones": 1,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:30.983",
      "driver": "Lewis Hamilton",
      "year": 2019
    },
    "svgFile": "/circuits/suzuka.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 647.8,
      "y": 312.7
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "americas": {
    "circuitId": "americas",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "美洲赛道",
    "nameEn": "Circuit of the Americas",
    "country": "美国",
    "city": "奥斯汀",
    "validFrom": 2012,
    "validTo": 2026,
    "lengthKm": 5.5,
    "turns": 20,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:36.169",
      "driver": "Charles Leclerc",
      "year": 2019
    },
    "svgFile": "/circuits/americas.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 190.4,
      "y": 427
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "rodriguez": {
    "circuitId": "rodriguez",
    "layoutId": "2015-current",
    "season": "2026",
    "nameZh": "罗德里格斯兄弟赛道",
    "nameEn": "Autódromo Hermanos Rodríguez",
    "country": "墨西哥",
    "city": "墨西哥城",
    "validFrom": 2015,
    "validTo": 2026,
    "lengthKm": 4.3,
    "turns": 17,
    "drsZones": 3,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:17.774",
      "driver": "Valtteri Bottas",
      "year": 2021
    },
    "svgFile": "/circuits/rodriguez.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 180.2,
      "y": 59.8
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "interlagos": {
    "circuitId": "interlagos",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "若泽·卡洛斯·佩斯赛道 (英特拉格斯)",
    "nameEn": "Autódromo José Carlos Pace (Interlagos)",
    "country": "巴西",
    "city": "圣保罗",
    "validFrom": 1990,
    "validTo": 2026,
    "lengthKm": 4.3,
    "turns": 15,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:10.540",
      "driver": "Valtteri Bottas",
      "year": 2018
    },
    "svgFile": "/circuits/interlagos.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 272.7,
      "y": 408.9
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "yas_marina": {
    "circuitId": "yas_marina",
    "layoutId": "2021-current",
    "season": "2026",
    "nameZh": "亚斯码头赛道",
    "nameEn": "Yas Marina Circuit",
    "country": "阿联酋",
    "city": "阿布扎比",
    "validFrom": 2021,
    "validTo": 2026,
    "lengthKm": 5.3,
    "turns": 16,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:26.103",
      "driver": "Max Verstappen",
      "year": 2021
    },
    "svgFile": "/circuits/yas_marina.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 397.1,
      "y": 330.1
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "imola": {
    "circuitId": "imola",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "恩佐与迪诺·法拉利赛道 (伊莫拉)",
    "nameEn": "Autodromo Enzo e Dino Ferrari (Imola)",
    "country": "意大利",
    "city": "伊莫拉",
    "validFrom": 1980,
    "validTo": 2026,
    "lengthKm": 4.9,
    "turns": 19,
    "drsZones": 1,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:15.484",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "svgFile": "/circuits/imola.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 494.1,
      "y": 161.4
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "nurburgring": {
    "circuitId": "nurburgring",
    "layoutId": "gp-strecke",
    "season": "2026",
    "nameZh": "纽博格林赛道 (GP 布局)",
    "nameEn": "Nürburgring GP-Strecke",
    "country": "德国",
    "city": "纽博格",
    "validFrom": 1984,
    "validTo": 2020,
    "lengthKm": 5.1,
    "turns": 16,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:28.139",
      "driver": "Max Verstappen",
      "year": 2020
    },
    "svgFile": "/circuits/nurburgring.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 529.2,
      "y": 129
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "portimao": {
    "circuitId": "portimao",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "阿尔加维国际赛道 (波尔蒂芒)",
    "nameEn": "Autódromo Internacional do Algarve",
    "country": "葡萄牙",
    "city": "波尔蒂芒",
    "validFrom": 2020,
    "validTo": 2021,
    "lengthKm": 4.7,
    "turns": 15,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:18.750",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "svgFile": "/circuits/portimao.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 300.7,
      "y": 259.9
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "mugello": {
    "circuitId": "mugello",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "穆杰罗赛道",
    "nameEn": "Autodromo Internazionale del Mugello",
    "country": "意大利",
    "city": "斯卡佩里亚",
    "validFrom": 2020,
    "validTo": 2020,
    "lengthKm": 5.2,
    "turns": 15,
    "drsZones": 1,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:18.833",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "svgFile": "/circuits/mugello.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 398.3,
      "y": 292.1
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "sepang": {
    "circuitId": "sepang",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "雪邦国际赛车场",
    "nameEn": "Sepang International Circuit",
    "country": "马来西亚",
    "city": "雪邦",
    "validFrom": 1999,
    "validTo": 2017,
    "lengthKm": 5.5,
    "turns": 15,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:34.080",
      "driver": "Sebastian Vettel",
      "year": 2017
    },
    "svgFile": "/circuits/sepang.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 273.5,
      "y": 320.4
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "istanbul": {
    "circuitId": "istanbul",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "伊斯坦布尔赛车场",
    "nameEn": "Intercity Istanbul Park",
    "country": "土耳其",
    "city": "伊斯坦布尔",
    "validFrom": 2005,
    "validTo": 2021,
    "lengthKm": 5.3,
    "turns": 14,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:24.770",
      "driver": "Juan Pablo Montoya",
      "year": 2005
    },
    "svgFile": "/circuits/istanbul.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 315.9,
      "y": 518.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "zandvoort": {
    "circuitId": "zandvoort",
    "layoutId": "2020-current",
    "season": "2026",
    "nameZh": "赞德福特赛道",
    "nameEn": "Circuit Zandvoort",
    "country": "荷兰",
    "city": "赞德福特",
    "validFrom": 2020,
    "validTo": 2026,
    "lengthKm": 4.3,
    "turns": 14,
    "drsZones": 2,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:11.097",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "svgFile": "/circuits/zandvoort.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 178.3,
      "y": 278.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "magny_cours": {
    "circuitId": "magny_cours",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "马尼库尔赛道",
    "nameEn": "Circuit de Nevers Magny-Cours",
    "country": "法国",
    "city": "马尼库尔",
    "validFrom": 1991,
    "validTo": 2008,
    "lengthKm": 4.4,
    "turns": 17,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:15.377",
      "driver": "Michael Schumacher",
      "year": 2004
    },
    "svgFile": "/circuits/magny_cours.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 365,
      "y": 282.7
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "estoril": {
    "circuitId": "estoril",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "埃斯托里尔赛道",
    "nameEn": "Autódromo do Estoril",
    "country": "葡萄牙",
    "city": "埃斯托里尔",
    "validFrom": 1984,
    "validTo": 1996,
    "lengthKm": 4.3,
    "turns": 13,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:13.041",
      "driver": "Damon Hill",
      "year": 1993
    },
    "svgFile": "/circuits/estoril.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 428.5,
      "y": 371.9
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "jacarepagua": {
    "circuitId": "jacarepagua",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "雅卡雷帕瓜赛道 (内尔松·皮奎特)",
    "nameEn": "Autódromo Internacional Nelson Piquet",
    "country": "巴西",
    "city": "里约热内卢",
    "validFrom": 1978,
    "validTo": 1989,
    "lengthKm": 5,
    "turns": 11,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:32.410",
      "driver": "Riccardo Patrese",
      "year": 1989
    },
    "svgFile": "/circuits/jacarepagua.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 357.2,
      "y": 133.4
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "jeddah": {
    "circuitId": "jeddah",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "吉达滨海街区赛道",
    "nameEn": "Jeddah Corniche Circuit",
    "country": "沙特阿拉伯",
    "city": "吉达",
    "validFrom": 2021,
    "validTo": 2026,
    "lengthKm": 6.2,
    "turns": 27,
    "drsZones": 3,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:30.734",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "svgFile": "/circuits/jeddah.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 425.7,
      "y": 435
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "miami": {
    "circuitId": "miami",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "迈阿密国际赛道",
    "nameEn": "Miami International Autodrome",
    "country": "美国",
    "city": "迈阿密",
    "validFrom": 2022,
    "validTo": 2026,
    "lengthKm": 5.4,
    "turns": 19,
    "drsZones": 3,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:29.708",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "svgFile": "/circuits/miami.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 395.5,
      "y": 238.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "losail": {
    "circuitId": "losail",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "罗塞尔国际赛车场",
    "nameEn": "Losail International Circuit",
    "country": "卡塔尔",
    "city": "卢赛尔",
    "validFrom": 2021,
    "validTo": 2026,
    "lengthKm": 5.4,
    "turns": 16,
    "drsZones": 1,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:23.196",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "svgFile": "/circuits/losail.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 262.6,
      "y": 352.6
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "madring": {
    "circuitId": "madring",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "马德里街区赛道 (Madring)",
    "nameEn": "Circuito de Madring",
    "country": "西班牙",
    "city": "马德里",
    "validFrom": 2026,
    "validTo": 2035,
    "lengthKm": 5.5,
    "turns": 20,
    "drsZones": 2,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": null,
    "svgFile": "/circuits/madring.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 441.3,
      "y": 522.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "baku": {
    "circuitId": "baku",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "巴库城市赛道",
    "nameEn": "Baku City Circuit",
    "country": "阿塞拜疆",
    "city": "巴库",
    "validFrom": 2016,
    "validTo": 2026,
    "lengthKm": 6,
    "turns": 20,
    "drsZones": 2,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:43.009",
      "driver": "Charles Leclerc",
      "year": 2019
    },
    "svgFile": "/circuits/baku.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 687.3,
      "y": 178.1
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "vegas": {
    "circuitId": "vegas",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "拉斯维加斯街区赛道",
    "nameEn": "Las Vegas Street Circuit",
    "country": "美国",
    "city": "拉斯维加斯",
    "validFrom": 2023,
    "validTo": 2026,
    "lengthKm": 6.2,
    "turns": 17,
    "drsZones": 2,
    "type": "street",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:35.490",
      "driver": "Oscar Piastri",
      "year": 2023
    },
    "svgFile": "/circuits/vegas.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 524.8,
      "y": 493.9
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "indianapolis": {
    "circuitId": "indianapolis",
    "layoutId": "f1-infield",
    "season": "2026",
    "nameZh": "印第安纳波利斯赛道 (F1 内场)",
    "nameEn": "Indianapolis Motor Speedway (F1)",
    "country": "美国",
    "city": "印第安纳波利斯",
    "validFrom": 2000,
    "validTo": 2007,
    "lengthKm": 4.2,
    "turns": 13,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:10.399",
      "driver": "Rubens Barrichello",
      "year": 2004
    },
    "svgFile": "/circuits/indianapolis.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 285.6,
      "y": 358
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "galvez": {
    "circuitId": "galvez",
    "layoutId": "no6",
    "season": "2026",
    "nameZh": "加尔韦斯赛车场 (布宜诺斯艾利斯)",
    "nameEn": "Autódromo Oscar y Juan Gálvez",
    "country": "阿根廷",
    "city": "布宜诺斯艾利斯",
    "validFrom": 1953,
    "validTo": 1998,
    "lengthKm": 4.3,
    "turns": 15,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:27.981",
      "driver": "Gerhard Berger",
      "year": 1997
    },
    "svgFile": "/circuits/galvez.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 362.5,
      "y": 246.1
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "kyalami": {
    "circuitId": "kyalami",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "卡拉米赛道",
    "nameEn": "Kyalami Grand Prix Circuit",
    "country": "南非",
    "city": "约翰内斯堡",
    "validFrom": 1967,
    "validTo": 1993,
    "lengthKm": 4.5,
    "turns": 16,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:17.578",
      "driver": "Nigel Mansell",
      "year": 1992
    },
    "svgFile": "/circuits/kyalami.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 508.5,
      "y": 399.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  },
  "watkins_glen": {
    "circuitId": "watkins_glen",
    "layoutId": "grand-prix",
    "season": "2026",
    "nameZh": "沃特金斯格伦赛道",
    "nameEn": "Watkins Glen International",
    "country": "美国",
    "city": "沃特金斯格伦",
    "validFrom": 1961,
    "validTo": 1980,
    "lengthKm": 5.4,
    "turns": 11,
    "drsZones": 0,
    "type": "permanent",
    "direction": "clockwise",
    "lapRecord": {
      "time": "1:34.077",
      "driver": "Alan Jones",
      "year": 1979
    },
    "svgFile": "/circuits/watkins_glen.svg",
    "viewBox": "0 0 800 600",
    "startFinish": {
      "x": 304,
      "y": 152.5
    },
    "geojsonSource": "Tomislav Bacinger f1-circuits.geojson (MIT License)"
  }
};
