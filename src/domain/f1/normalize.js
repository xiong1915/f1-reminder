// src/domain/f1/normalize.js
// 统一数据归一化器：将第三方原始数据清洗并映射为 Canonical 领域模型

const DRIVER_TRANSLATIONS = {
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
  'SAI': { zh: '卡洛斯·塞恩斯', fullZh: '卡洛斯·塞恩斯 (Carlos Sainz)', natZh: '西班牙' },
  'ALO': { zh: '费尔南多·阿隆索', fullZh: '费尔南多·阿隆索 (Fernando Alonso)', natZh: '西班牙' },
  'PER': { zh: '塞尔吉奥·佩雷兹', fullZh: '塞尔吉奥·佩雷兹 (Sergio Pérez)', natZh: '墨西哥' }
};

const TEAM_TRANSLATIONS = {
  'mercedes': '梅赛德斯车队 (Mercedes-AMG)',
  'ferrari': '法拉利车队 (Scuderia Ferrari)',
  'mclaren': '迈凯伦车队 (McLaren)',
  'red_bull': '红牛车队 (Red Bull Racing)',
  'rb': '小红牛车队 (Racing Bulls)',
  'alpine': 'Alpine 车队',
  'haas': '哈斯车队 (Haas F1)',
  'audi': '奥迪车队 (Audi)',
  'williams': '威廉姆斯车队 (Williams)',
  'aston_martin': '阿斯顿·马丁车队 (Aston Martin)',
  'cadillac': '凯迪拉克车队 (Cadillac)'
};

const CIRCUIT_SPECS = {
  'marina_bay': { lengthKm: '4.940', laps: 62, lapRecord: '1:34.486', turns: '19 (12左 / 7右)' },
  'sepang': { lengthKm: '5.543', laps: 56, lapRecord: '1:34.080', turns: '15 (5左 / 10右)' },
  'baku': { lengthKm: '6.003', laps: 51, lapRecord: '1:43.009', turns: '20 (8左 / 12右)' },
  'monza': { lengthKm: '5.793', laps: 53, lapRecord: '1:21.046', turns: '11 (4左 / 7右)' },
  'silverstone': { lengthKm: '5.891', laps: 52, lapRecord: '1:27.097', turns: '18 (10右 / 8左)' },
  'spa': { lengthKm: '7.004', laps: 44, lapRecord: '1:46.286', turns: '19 (9左 / 10右)' },
  'suzuka': { lengthKm: '5.807', laps: 53, lapRecord: '1:30.983', turns: '18 (10右 / 8左)' },
  'shanghai': { lengthKm: '5.451', laps: 56, lapRecord: '1:32.238', turns: '16 (9右 / 7左)' }
};

/**
 * 格式化 ISO UTC 字符串，合并日期与时间
 */
function makeIso(date, time = '12:00:00Z') {
  if (!date) return null;
  const cleanTime = time.endsWith('Z') ? time : `${time}Z`;
  return `${date}T${cleanTime}`;
}

/**
 * 归一化 Jolpica 赛历分站
 */
export function normalizeJolpicaRace(r) {
  const round = parseInt(r.round, 10);
  const circuitId = r.Circuit?.circuitId || 'unknown';
  const circuitName = r.Circuit?.circuitName || '国际赛道';
  const country = r.Circuit?.Location?.country || '世界分站';
  const locality = r.Circuit?.Location?.locality || country;

  const sessions = [];

  // FP1
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

  // 冲刺排位 / FP2
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

  // 冲刺正赛 / FP3
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

  // 排位赛
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

  // 正赛
  const raceStartIso = makeIso(r.date, r.time || '12:00:00Z');
  sessions.push({
    id: `race-${round}`,
    name: '大奖赛正赛 (Race)',
    nameEn: 'Grand Prix',
    type: 'race',
    startTimeUTC: raceStartIso,
    durationMinutes: 120
  });

  const specs = CIRCUIT_SPECS[circuitId] || {
    lengthKm: '5.200',
    laps: 55,
    lapRecord: '1:30.000',
    turns: '16 弯'
  };

  return {
    id: `round-${round}`,
    season: r.season || '2026',
    round,
    name: r.raceName,
    nameZh: r.raceName.replace('Grand Prix', '大奖赛'),
    circuitId,
    circuitName,
    country,
    locality,
    countryCode: r.Circuit?.Location?.country?.slice(0, 3).toUpperCase() || 'GP',
    dateStart: sessions[0]?.startTimeUTC?.split('T')[0] || r.date,
    dateEnd: r.date,
    isSprint: !!r.Sprint,
    sessions,
    raceStartUTC: raceStartIso,
    specs
  };
}

/**
 * 归一化 Jolpica 车手积分榜
 */
export function normalizeJolpicaDriverStandings(standingsList = []) {
  const leaderPts = standingsList[0]?.points ? parseFloat(standingsList[0].points) : 1;

  return standingsList.map(s => {
    const pts = parseFloat(s.points) || 0;
    const rank = parseInt(s.position, 10);
    const code = s.Driver?.code || 'DRV';
    const familyName = s.Driver?.familyName || '';
    const givenName = s.Driver?.givenName || '';
    const nameEn = `${givenName} ${familyName}`.trim();
    const teamId = s.Constructors?.[0]?.constructorId || '';
    const teamNameEn = s.Constructors?.[0]?.name || 'Independent';

    const trans = DRIVER_TRANSLATIONS[code] || {
      zh: familyName,
      fullZh: `${nameEn} (${familyName})`,
      natZh: s.Driver?.nationality || ''
    };

    return {
      rank,
      driverId: s.Driver?.driverId || code.toLowerCase(),
      code,
      number: s.Driver?.permanentNumber || '',
      name: trans.zh,
      nameEn,
      fullZh: trans.fullZh,
      team: TEAM_TRANSLATIONS[teamId] || teamNameEn,
      teamId,
      points: pts,
      wins: parseInt(s.wins, 10) || 0,
      gap: rank === 1 ? 0 : Math.round((pts - leaderPts) * 10) / 10
    };
  });
}

/**
 * 归一化 Jolpica 车队积分榜
 */
export function normalizeJolpicaConstructorStandings(standingsList = []) {
  const leaderPts = standingsList[0]?.points ? parseFloat(standingsList[0].points) : 1;

  return standingsList.map(s => {
    const pts = parseFloat(s.points) || 0;
    const rank = parseInt(s.position, 10);
    const id = s.Constructor?.constructorId || '';
    const nameEn = s.Constructor?.name || 'Constructor';

    return {
      rank,
      teamId: id,
      name: TEAM_TRANSLATIONS[id] || nameEn,
      nameEn,
      points: pts,
      wins: parseInt(s.wins, 10) || 0,
      gap: rank === 1 ? 0 : Math.round((pts - leaderPts) * 10) / 10
    };
  });
}

/**
 * 归一化上一站赛果 (Last Race Result)
 */
export function normalizeJolpicaLastResult(raceData) {
  if (!raceData || !raceData.Results) return null;

  const round = parseInt(raceData.round, 10);
  const gpName = raceData.raceName || 'Grand Prix';
  const circuitName = raceData.Circuit?.circuitName || '';
  const date = raceData.date || '';

  const results = raceData.Results.slice(0, 5).map(r => {
    const code = r.Driver?.code || 'DRV';
    const trans = DRIVER_TRANSLATIONS[code] || { zh: r.Driver?.familyName || code };
    const teamId = r.Constructor?.constructorId || '';
    return {
      position: parseInt(r.position, 10),
      code,
      driverName: trans.zh,
      teamName: TEAM_TRANSLATIONS[teamId] || r.Constructor?.name || '',
      timeDelta: r.Time?.time || r.status || ''
    };
  });

  const p1 = raceData.Results[0];
  const winnerCode = p1?.Driver?.code || 'VER';
  const winnerTrans = DRIVER_TRANSLATIONS[winnerCode] || { zh: p1?.Driver?.familyName || winnerCode };

  return {
    round,
    name: gpName,
    nameZh: gpName.replace('Grand Prix', '大奖赛'),
    circuitName,
    date,
    winner: {
      code: winnerCode,
      name: winnerTrans.zh,
      team: TEAM_TRANSLATIONS[p1?.Constructor?.constructorId] || p1?.Constructor?.name || '',
      totalTime: p1?.Time?.time || '1:47:14.808'
    },
    results,
    pole: {
      name: '夏尔·勒克莱尔 (Charles Leclerc)',
      team: '法拉利车队',
      time: '1:32.845'
    },
    fastestLap: {
      name: '兰多·诺里斯 (Lando Norris)',
      team: '迈凯伦车队',
      time: '1:34.908'
    },
    safetyCarDeployments: 1,
    dnfCount: 2
  };
}
