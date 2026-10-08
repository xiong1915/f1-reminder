// lib/f1/normalize.ts
// 统一数据归一化器：将第三方原始数据清洗并映射为中文 Canonical 领域模型

import { F1Meeting, F1Session, DriverStanding, ConstructorStanding, RaceResultSummary } from './types';

export const DRIVER_TRANSLATIONS: Record<string, { zh: string; fullZh: string; natZh: string }> = {
  'ANT': { zh: '基米·安东内利', fullZh: '基米·安东内利 (Kimi Antonelli)', natZh: '意大利' },
  'RUS': { zh: '乔治·拉塞尔', fullZh: '乔治·拉塞尔 (George Russell)', natZh: '英国' },
  'HAM': { zh: '刘易斯·汉密尔顿', fullZh: '刘易斯·汉密尔顿 (Lewis Hamilton)', natZh: '英国' },
  'LEC': { zh: '夏尔·勒克莱尔', fullZh: '夏尔·勒克莱尔 (Charles Leclerc)', natZh: '摩纳哥' },
  'NOR': { zh: '兰多·诺里斯', fullZh: '兰多·诺里斯 (Lando Norris)', natZh: '英国' },
  'VER': { zh: '马克斯·维斯塔潘', fullZh: '马克斯·维斯塔潘 (Max Verstappen)', natZh: '荷兰' },
  'PIA': { zh: '奥斯卡·皮亚斯特里', fullZh: '奥斯卡·皮亚斯特里 (Oscar Piastri)', natZh: '澳大利亚' },
  'HAD': { zh: '伊萨克·哈贾尔', fullZh: '伊萨克·哈贾尔 (Isack Hadjar)', natZh: '法国' },
  'LAW': { zh: '利亚姆·罗森', fullZh: '利亚姆·罗森 (Liam Lawson)', natZh: '新西兰' },
  'GAS': { zh: '皮埃尔·加斯利', fullZh: '皮埃尔·加斯利 (Pierre Gasly)', natZh: '法国' },
  'LIN': { zh: '阿尔维德·林德布拉德', fullZh: '阿尔维德·林德布拉德 (Arvid Lindblad)', natZh: '英国' },
  'COL': { zh: '弗兰科·科拉平托', fullZh: '弗兰科·科拉平托 (Franco Colapinto)', natZh: '阿根廷' },
  'BEA': { zh: '奥利弗·贝尔曼', fullZh: '奥利弗·贝尔曼 (Oliver Bearman)', natZh: '英国' },
  'BOR': { zh: '加布里埃尔·博托莱托', fullZh: '加布里埃尔·博托莱托 (Gabriel Bortoleto)', natZh: '巴西' },
  'HUL': { zh: '尼科·霍肯伯格', fullZh: '尼科·霍肯伯格 (Nico Hülkenberg)', natZh: '德国' },
  'OCO': { zh: '埃斯特班·奥康', fullZh: '埃斯特班·奥康 (Esteban Ocon)', natZh: '法国' },
  'ALO': { zh: '费尔南多·阿隆索', fullZh: '费尔南多·阿隆索 (Fernando Alonso)', natZh: '西班牙' },
  'SAI': { zh: '卡洛斯·塞恩斯', fullZh: '卡洛斯·塞恩斯 (Carlos Sainz)', natZh: '西班牙' },
  'ALB': { zh: '亚历山大·阿尔本', fullZh: '亚历山大·阿尔本 (Alexander Albon)', natZh: '泰国' },
  'TSU': { zh: '角田裕毅', fullZh: '角田裕毅 (Yuki Tsunoda)', natZh: '日本' },
  'STR': { zh: '兰斯·斯托尔', fullZh: '兰斯·斯托尔 (Lance Stroll)', natZh: '加拿大' },
  'BOT': { zh: '瓦尔特利·博塔斯', fullZh: '瓦尔特利·博塔斯 (Valtteri Bottas)', natZh: '芬兰' },
  'PER': { zh: '塞尔吉奥·佩雷兹', fullZh: '塞尔吉奥·佩雷兹 (Sergio Pérez)', natZh: '墨西哥' },
  'ZHO': { zh: '周冠宇', fullZh: '周冠宇 (Guanyu Zhou)', natZh: '中国' },
  'DOO': { zh: '杰克·杜汉', fullZh: '杰克·杜汉 (Jack Doohan)', natZh: '澳大利亚' },
  'RIC': { zh: '丹尼尔·里卡多', fullZh: '丹尼尔·里卡多 (Daniel Ricciardo)', natZh: '澳大利亚' },
  'MAG': { zh: '凯文·马格努森', fullZh: '凯文·马格努森 (Kevin Magnussen)', natZh: '丹麦' },
  'SAR': { zh: '罗根·萨金特', fullZh: '罗根·萨金特 (Logan Sargeant)', natZh: '美国' }
};

export const DRIVER_BY_ID: Record<string, { zh: string; fullZh: string; natZh: string }> = {
  'antonelli': { zh: '基米·安东内利', fullZh: '基米·安东内利 (Kimi Antonelli)', natZh: '意大利' },
  'russell': { zh: '乔治·拉塞尔', fullZh: '乔治·拉塞尔 (George Russell)', natZh: '英国' },
  'hamilton': { zh: '刘易斯·汉密尔顿', fullZh: '刘易斯·汉密尔顿 (Lewis Hamilton)', natZh: '英国' },
  'leclerc': { zh: '夏尔·勒克莱尔', fullZh: '夏尔·勒克莱尔 (Charles Leclerc)', natZh: '摩纳哥' },
  'norris': { zh: '兰多·诺里斯', fullZh: '兰多·诺里斯 (Lando Norris)', natZh: '英国' },
  'max_verstappen': { zh: '马克斯·维斯塔潘', fullZh: '马克斯·维斯塔潘 (Max Verstappen)', natZh: '荷兰' },
  'verstappen': { zh: '马克斯·维斯塔潘', fullZh: '马克斯·维斯塔潘 (Max Verstappen)', natZh: '荷兰' },
  'piastri': { zh: '奥斯卡·皮亚斯特里', fullZh: '奥斯卡·皮亚斯特里 (Oscar Piastri)', natZh: '澳大利亚' },
  'hadjar': { zh: '伊萨克·哈贾尔', fullZh: '伊萨克·哈贾尔 (Isack Hadjar)', natZh: '法国' },
  'lawson': { zh: '利亚姆·罗森', fullZh: '利亚姆·罗森 (Liam Lawson)', natZh: '新西兰' },
  'gasly': { zh: '皮埃尔·加斯利', fullZh: '皮埃尔·加斯利 (Pierre Gasly)', natZh: '法国' },
  'arvid_lindblad': { zh: '阿尔维德·林德布拉德', fullZh: '阿尔维德·林德布拉德 (Arvid Lindblad)', natZh: '英国' },
  'lindblad': { zh: '阿尔维德·林德布拉德', fullZh: '阿尔维德·林德布拉德 (Arvid Lindblad)', natZh: '英国' },
  'colapinto': { zh: '弗兰科·科拉平托', fullZh: '弗兰科·科拉平托 (Franco Colapinto)', natZh: '阿根廷' },
  'bearman': { zh: '奥利弗·贝尔曼', fullZh: '奥利弗·贝尔曼 (Oliver Bearman)', natZh: '英国' },
  'bortoleto': { zh: '加布里埃尔·博托莱托', fullZh: '加布里埃尔·博托莱托 (Gabriel Bortoleto)', natZh: '巴西' },
  'hulkenberg': { zh: '尼科·霍肯伯格', fullZh: '尼科·霍肯伯格 (Nico Hülkenberg)', natZh: '德国' },
  'ocon': { zh: '埃斯特班·奥康', fullZh: '埃斯特班·奥康 (Esteban Ocon)', natZh: '法国' },
  'alonso': { zh: '费尔南多·阿隆索', fullZh: '费尔南多·阿隆索 (Fernando Alonso)', natZh: '西班牙' },
  'sainz': { zh: '卡洛斯·塞恩斯', fullZh: '卡洛斯·塞恩斯 (Carlos Sainz)', natZh: '西班牙' },
  'albon': { zh: '亚历山大·阿尔本', fullZh: '亚历山大·阿尔本 (Alexander Albon)', natZh: '泰国' },
  'tsunoda': { zh: '角田裕毅', fullZh: '角田裕毅 (Yuki Tsunoda)', natZh: '日本' },
  'stroll': { zh: '兰斯·斯托尔', fullZh: '兰斯·斯托尔 (Lance Stroll)', natZh: '加拿大' },
  'bottas': { zh: '瓦尔特利·博塔斯', fullZh: '瓦尔特利·博塔斯 (Valtteri Bottas)', natZh: '芬兰' },
  'perez': { zh: '塞尔吉奥·佩雷兹', fullZh: '塞尔吉奥·佩雷兹 (Sergio Pérez)', natZh: '墨西哥' },
  'zhou': { zh: '周冠宇', fullZh: '周冠宇 (Guanyu Zhou)', natZh: '中国' },
  'doohan': { zh: '杰克·杜汉', fullZh: '杰克·杜汉 (Jack Doohan)', natZh: '澳大利亚' },
  'ricciardo': { zh: '丹尼尔·里卡多', fullZh: '丹尼尔·里卡多 (Daniel Ricciardo)', natZh: '澳大利亚' },
  'magnussen': { zh: '凯文·马格努森', fullZh: '凯文·马格努森 (Kevin Magnussen)', natZh: '丹麦' },
  'sargeant': { zh: '罗根·萨金特', fullZh: '罗根·萨金特 (Logan Sargeant)', natZh: '美国' }
};

export const TEAM_TRANSLATIONS: Record<string, string> = {
  'mercedes': '梅赛德斯车队 (Mercedes-AMG)',
  'ferrari': '法拉利车队 (Scuderia Ferrari)',
  'mclaren': '迈凯伦车队 (McLaren)',
  'red_bull': '红牛车队 (Red Bull Racing)',
  'rb': '小红牛车队 (Racing Bulls)',
  'alpine': 'Alpine 车队',
  'haas': '哈斯车队 (Haas F1)',
  'audi': '奥迪车队 (Audi)',
  'sauber': '索伯车队 (Kick Sauber)',
  'williams': '威廉姆斯车队 (Williams)',
  'aston_martin': '阿斯顿·马丁车队 (Aston Martin)',
  'cadillac': '凯迪拉克车队 (Cadillac)'
};

export const LOCALITY_TRANSLATIONS: Record<string, string> = {
  'Melbourne': '墨尔本',
  'Shanghai': '上海',
  'Suzuka': '铃鹿',
  'Sakhir': '萨基尔',
  'Jeddah': '吉达',
  'Miami': '迈阿密',
  'Imola': '伊莫拉',
  'Monaco': '摩纳哥',
  'Monte Carlo': '蒙特卡洛',
  'Montreal': '蒙特利尔',
  'Barcelona': '巴塞罗那',
  'Montmeló': '加泰罗尼亚',
  'Spielberg': '斯皮尔伯格',
  'Silverstone': '银石',
  'Budapest': '布达佩斯',
  'Spa': '斯帕',
  'Francorchamps': '斯帕',
  'Zandvoort': '赞德福特',
  'Monza': '蒙扎',
  'Baku': '巴库',
  'Singapore': '新加坡',
  'Austin': '奥斯汀',
  'Mexico City': '墨西哥城',
  'Sao Paulo': '圣保罗',
  'São Paulo': '圣保罗',
  'Las Vegas': '拉斯维加斯',
  'Lusail': '卢赛尔',
  'Losail': '卢赛尔',
  'Abu Dhabi': '阿布扎比',
  'Sepang': '雪邦',
  'Kuala Lumpur': '吉隆坡'
};

export const COUNTRY_TRANSLATIONS: Record<string, string> = {
  'Australia': '澳大利亚',
  'China': '中国',
  'Japan': '日本',
  'Bahrain': '巴林',
  'Saudi Arabia': '沙特阿拉伯',
  'United States': '美国',
  'USA': '美国',
  'Italy': '意大利',
  'Monaco': '摩纳哥',
  'Canada': '加拿大',
  'Spain': '西班牙',
  'Austria': '奥地利',
  'United Kingdom': '英国',
  'UK': '英国',
  'Great Britain': '英国',
  'Hungary': '匈牙利',
  'Belgium': '比利时',
  'Netherlands': '荷兰',
  'Azerbaijan': '阿塞拜疆',
  'Singapore': '新加坡',
  'Mexico': '墨西哥',
  'Brazil': '巴西',
  'Qatar': '卡塔尔',
  'UAE': '阿联酋',
  'United Arab Emirates': '阿联酋',
  'Malaysia': '马来西亚',
  'Italian': '意大利',
  'British': '英国',
  'Monegasque': '摩纳哥',
  'Monégasque': '摩纳哥',
  'Dutch': '荷兰',
  'Australian': '澳大利亚',
  'French': '法国',
  'New Zealander': '新西兰',
  'Argentine': '阿根廷',
  'Brazilian': '巴西',
  'German': '德国',
  'Spanish': '西班牙',
  'Thai': '泰国',
  'Japanese': '日本',
  'Canadian': '加拿大',
  'Finnish': '芬兰',
  'Mexican': '墨西哥',
  'Chinese': '中国',
  'Danish': '丹麦',
  'American': '美国',
  'Austrian': '奥地利',
  'Swiss': '瑞士'
};

export const RACE_NAME_TRANSLATIONS: Record<string, string> = {
  'Australian Grand Prix': '澳大利亚大奖赛',
  'Chinese Grand Prix': '中国大奖赛',
  'Japanese Grand Prix': '日本大奖赛',
  'Bahrain Grand Prix': '巴林大奖赛',
  'Saudi Arabian Grand Prix': '沙特阿拉伯大奖赛',
  'Miami Grand Prix': '迈阿密大奖赛',
  'Emilia Romagna Grand Prix': '艾米利亚-罗马涅大奖赛',
  'Monaco Grand Prix': '摩纳哥大奖赛',
  'Canadian Grand Prix': '加拿大大奖赛',
  'Spanish Grand Prix': '西班牙大奖赛',
  'Austrian Grand Prix': '奥地利大奖赛',
  'British Grand Prix': '英国大奖赛',
  'Hungarian Grand Prix': '匈牙利大奖赛',
  'Belgian Grand Prix': '比利时大奖赛',
  'Dutch Grand Prix': '荷兰大奖赛',
  'Italian Grand Prix': '意大利大奖赛',
  'Azerbaijan Grand Prix': '阿塞拜疆大奖赛',
  'Singapore Grand Prix': '新加坡大奖赛',
  'United States Grand Prix': '美国大奖赛',
  'Mexico City Grand Prix': '墨西哥城大奖赛',
  'Sao Paulo Grand Prix': '圣保罗大奖赛',
  'Las Vegas Grand Prix': '拉斯维加斯大奖赛',
  'Qatar Grand Prix': '卡塔尔大奖赛',
  'Abu Dhabi Grand Prix': '阿布扎比大奖赛',
  'Bahrain Grand Prix in Malaysia': '马来西亚特别大奖赛'
};

export const CIRCUIT_NAME_TRANSLATIONS: Record<string, string> = {
  'Albert Park Grand Prix Circuit': '阿尔伯特公园街区赛道',
  'Shanghai International Circuit': '上海国际赛车场',
  'Suzuka Circuit': '铃鹿国际赛车场',
  'Bahrain International Circuit': '巴林国际赛车场',
  'Jeddah Corniche Circuit': '吉达滨海市街赛道',
  'Miami International Autodrome': '迈阿密国际赛道',
  'Autodromo Enzo e Dino Ferrari': '伊莫拉赛道 (恩佐与迪诺·法拉利)',
  'Circuit de Monaco': '蒙特卡洛市街赛道',
  'Circuit Gilles Villeneuve': '吉尔斯·维伦纽夫赛道',
  'Circuit de Barcelona-Catalunya': '加泰罗尼亚赛道',
  'Red Bull Ring': '红牛环赛道',
  'Silverstone Circuit': '银石赛道',
  'Hungaroring': '亨格罗宁赛道',
  'Circuit de Spa-Francorchamps': '斯帕-弗朗科尔尚赛道',
  'Circuit Zandvoort': '赞德福特赛道',
  'Autodromo Nazionale Monza': '蒙扎国家赛车场',
  'Baku City Circuit': '巴库市街赛道',
  'Marina Bay Street Circuit': '滨海湾市街赛道',
  'Circuit of the Americas': '美洲赛道 (COTA)',
  'Autódromo Hermanos Rodríguez': '罗德里格斯兄弟赛车场',
  'Autódromo José Carlos Pace': '英特拉格斯赛道 (若泽·卡洛斯·帕塞)',
  'Las Vegas Strip Circuit': '拉斯维加斯大道市街赛道',
  'Losail International Circuit': '卢赛尔国际赛车场',
  'Lusail International Circuit': '卢赛尔国际赛车场',
  'Yas Marina Circuit': '亚斯码头赛道',
  'Sepang International Circuit': '雪邦国际赛车场'
};

export const CIRCUIT_SPECS: Record<string, { lengthKm: string; laps: number; lapRecord: string; turns: string }> = {
  'marina_bay': { lengthKm: '4.940', laps: 62, lapRecord: '1:34.486', turns: '19 (12左 / 7右)' },
  'sepang': { lengthKm: '5.543', laps: 56, lapRecord: '1:34.080', turns: '15 (5左 / 10右)' },
  'baku': { lengthKm: '6.003', laps: 51, lapRecord: '1:43.009', turns: '20 (8左 / 12右)' },
  'monza': { lengthKm: '5.793', laps: 53, lapRecord: '1:21.046', turns: '11 (4左 / 7右)' },
  'silverstone': { lengthKm: '5.891', laps: 52, lapRecord: '1:27.097', turns: '18 (10右 / 8左)' },
  'spa': { lengthKm: '7.004', laps: 44, lapRecord: '1:46.286', turns: '19 (9左 / 10右)' },
  'suzuka': { lengthKm: '5.807', laps: 53, lapRecord: '1:30.983', turns: '18 (10右 / 8左)' },
  'shanghai': { lengthKm: '5.451', laps: 56, lapRecord: '1:32.238', turns: '16 (9右 / 7左)' }
};

function makeIso(date?: string, time: string = '12:00:00Z'): string {
  if (!date) return '';
  const cleanTime = time.endsWith('Z') ? time : `${time}Z`;
  return `${date}T${cleanTime}`;
}

export function normalizeJolpicaRace(r: any): F1Meeting {
  const round = parseInt(String(r.round), 10);
  const circuitId = r.Circuit?.circuitId || 'unknown';
  const rawCircuitName = r.Circuit?.circuitName || '国际赛道';
  const circuitName = CIRCUIT_NAME_TRANSLATIONS[rawCircuitName] || rawCircuitName;
  const rawCountry = r.Circuit?.Location?.country || '世界分站';
  const country = COUNTRY_TRANSLATIONS[rawCountry] || rawCountry;
  const rawLocality = r.Circuit?.Location?.locality || rawCountry;
  const locality = LOCALITY_TRANSLATIONS[rawLocality] || rawLocality;

  const sessions: F1Session[] = [];

  if (r.FirstPractice) {
    sessions.push({
      id: `fp1-${round}`,
      name: '第一次自由练习 (FP1)',
      nameEn: 'Practice 1',
      type: 'practice',
      startTimeUTC: makeIso(r.FirstPractice.date, r.FirstPractice.time),
      durationMinutes: 60
    });
  }

  if (r.SprintQualifying) {
    sessions.push({
      id: `sq-${round}`,
      name: '冲刺排位赛 (SQ)',
      nameEn: 'Sprint Qualifying',
      type: 'sprint_qualifying',
      startTimeUTC: makeIso(r.SprintQualifying.date, r.SprintQualifying.time),
      durationMinutes: 44
    });
  } else if (r.SecondPractice) {
    sessions.push({
      id: `fp2-${round}`,
      name: '第二次自由练习 (FP2)',
      nameEn: 'Practice 2',
      type: 'practice',
      startTimeUTC: makeIso(r.SecondPractice.date, r.SecondPractice.time),
      durationMinutes: 60
    });
  }

  if (r.Sprint) {
    sessions.push({
      id: `sprint-${round}`,
      name: '冲刺赛 (Sprint)',
      nameEn: 'Sprint',
      type: 'sprint',
      startTimeUTC: makeIso(r.Sprint.date, r.Sprint.time),
      durationMinutes: 60
    });
  } else if (r.ThirdPractice) {
    sessions.push({
      id: `fp3-${round}`,
      name: '第三次自由练习 (FP3)',
      nameEn: 'Practice 3',
      type: 'practice',
      startTimeUTC: makeIso(r.ThirdPractice.date, r.ThirdPractice.time),
      durationMinutes: 60
    });
  }

  if (r.Qualifying) {
    sessions.push({
      id: `quali-${round}`,
      name: '大奖赛排位赛 (Quali)',
      nameEn: 'Qualifying',
      type: 'qualifying',
      startTimeUTC: makeIso(r.Qualifying.date, r.Qualifying.time),
      durationMinutes: 60
    });
  }

  const raceStartUTC = makeIso(r.date, r.time);
  sessions.push({
    id: `race-${round}`,
    name: '大奖赛正赛 (Race)',
    nameEn: 'Grand Prix',
    type: 'race',
    startTimeUTC: raceStartUTC,
    durationMinutes: 120
  });

  const rawRaceName = r.raceName || '';
  const nameZh = RACE_NAME_TRANSLATIONS[rawRaceName] || `${locality}大奖赛`;

  return {
    meetingId: `${r.season || '2026'}-${circuitId || round}`,
    round,
    season: String(r.season || '2026'),
    name: rawRaceName,
    nameZh,
    country,
    locality,
    circuitId,
    circuitName,
    raceStartUTC,
    isSprintWeekend: Boolean(r.Sprint || r.SprintQualifying),
    sessions,
    specs: CIRCUIT_SPECS[circuitId]
  };
}

export function normalizeJolpicaDriverStandings(list: any[]): DriverStanding[] {
  let leaderPoints = 0;
  return list.map((item, idx) => {
    const code = (item.Driver?.code || 'UNK').toUpperCase();
    const driverId = (item.Driver?.driverId || code.toLowerCase()).toLowerCase();
    const points = parseFloat(item.points) || 0;
    if (idx === 0) leaderPoints = points;

    const trans = DRIVER_TRANSLATIONS[code] || DRIVER_BY_ID[driverId] || {
      zh: `${item.Driver?.givenName} ${item.Driver?.familyName}`,
      fullZh: `${item.Driver?.givenName} ${item.Driver?.familyName}`,
      natZh: COUNTRY_TRANSLATIONS[item.Driver?.nationality] || item.Driver?.nationality || '国际'
    };

    const teamKey = item.Constructors?.[0]?.constructorId || '';
    const teamName = TEAM_TRANSLATIONS[teamKey] || item.Constructors?.[0]?.name || '独立车队';

    return {
      rank: parseInt(item.position, 10) || (idx + 1),
      driverId,
      code,
      number: item.Driver?.permanentNumber || String(idx + 1),
      name: trans.zh,
      nameEn: `${item.Driver?.givenName} ${item.Driver?.familyName}`,
      fullZh: trans.fullZh,
      team: teamName,
      teamId: teamKey,
      points,
      wins: parseInt(item.wins, 10) || 0,
      gap: idx === 0 ? 0 : points - leaderPoints
    };
  });
}

export function normalizeJolpicaConstructorStandings(list: any[]): ConstructorStanding[] {
  let leaderPoints = 0;
  return list.map((item, idx) => {
    const teamKey = item.Constructor?.constructorId || '';
    const points = parseFloat(item.points) || 0;
    if (idx === 0) leaderPoints = points;

    const teamName = TEAM_TRANSLATIONS[teamKey] || item.Constructor?.name || 'F1 车队';

    return {
      rank: parseInt(item.position, 10) || (idx + 1),
      teamId: teamKey,
      name: teamName,
      nameEn: item.Constructor?.name || teamName,
      points,
      wins: parseInt(item.wins, 10) || 0,
      gap: idx === 0 ? 0 : points - leaderPoints
    };
  });
}

export function normalizeJolpicaLastResult(race: any): RaceResultSummary {
  const winnerItem = race.Results?.[0];
  const podium = (race.Results || []).slice(0, 3).map((r: any, idx: number) => {
    const code = (r.Driver?.code || 'UNK').toUpperCase();
    const driverId = (r.Driver?.driverId || '').toLowerCase();
    const driverTrans = DRIVER_TRANSLATIONS[code] || DRIVER_BY_ID[driverId] || {
      zh: `${r.Driver?.givenName} ${r.Driver?.familyName}`
    };
    return {
      position: idx + 1,
      code,
      name: driverTrans.zh,
      team: TEAM_TRANSLATIONS[r.Constructor?.constructorId] || r.Constructor?.name || ''
    };
  });

  const rawRaceName = race.raceName || '';
  const nameZh = RACE_NAME_TRANSLATIONS[rawRaceName] || `${race.Circuit?.Location?.locality || '国际'}大奖赛`;
  const rawLoc = race.Circuit?.Location?.locality || '国际赛道';
  const localityZh = LOCALITY_TRANSLATIONS[rawLoc] || rawLoc;

  const winnerCode = (winnerItem?.Driver?.code || 'VER').toUpperCase();
  const winnerId = (winnerItem?.Driver?.driverId || '').toLowerCase();
  const winnerName = DRIVER_TRANSLATIONS[winnerCode]?.zh || DRIVER_BY_ID[winnerId]?.zh || `${winnerItem?.Driver?.givenName} ${winnerItem?.Driver?.familyName}` || '分站冠军';

  return {
    round: parseInt(race.round, 10),
    season: String(race.season),
    name: nameZh,
    locality: localityZh,
    date: race.date,
    winner: {
      code: winnerCode,
      name: winnerName,
      team: TEAM_TRANSLATIONS[winnerItem?.Constructor?.constructorId] || 'F1 车队'
    },
    podium
  };
}
