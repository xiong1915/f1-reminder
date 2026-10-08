// src/cache/fallback_data.js
// 经真实 Jolpica / OpenF1 校验的标准离线基准数据集（用于冷启动容灾与网络离线平滑降级）

export const FALLBACK_2026_CALENDAR = [
  { round: 1, name: "Australian Grand Prix", nameZh: "澳大利亚大奖赛", circuit: "Albert Park Circuit", dateStart: "2026-03-06", dateEnd: "2026-03-08", isSprint: false, status: "finished" },
  { round: 2, name: "Chinese Grand Prix", nameZh: "中国大奖赛", circuit: "Shanghai International Circuit", dateStart: "2026-03-13", dateEnd: "2026-03-15", isSprint: true, status: "finished" },
  { round: 3, name: "Japanese Grand Prix", nameZh: "日本大奖赛", circuit: "Suzuka Circuit", dateStart: "2026-03-27", dateEnd: "2026-03-29", isSprint: false, status: "finished" },
  { round: 4, name: "Miami Grand Prix", nameZh: "迈阿密大奖赛", circuit: "Miami International Autodrome", dateStart: "2026-05-01", dateEnd: "2026-05-03", isSprint: true, status: "finished" },
  { round: 5, name: "Canadian Grand Prix", nameZh: "加拿大大奖赛", circuit: "Circuit Gilles Villeneuve", dateStart: "2026-05-22", dateEnd: "2026-05-24", isSprint: false, status: "finished" },
  { round: 6, name: "Monaco Grand Prix", nameZh: "摩纳哥大奖赛", circuit: "Circuit de Monaco", dateStart: "2026-06-05", dateEnd: "2026-06-07", isSprint: false, status: "finished" },
  { round: 7, name: "Barcelona Grand Prix", nameZh: "加泰罗尼亚大奖赛", circuit: "Circuit de Barcelona-Catalunya", dateStart: "2026-06-12", dateEnd: "2026-06-14", isSprint: false, status: "finished" },
  { round: 8, name: "Austrian Grand Prix", nameZh: "奥地利大奖赛", circuit: "Red Bull Ring", dateStart: "2026-06-26", dateEnd: "2026-06-28", isSprint: true, status: "finished" },
  { round: 9, name: "British Grand Prix", nameZh: "英国大奖赛", circuit: "Silverstone Circuit", dateStart: "2026-07-03", dateEnd: "2026-07-05", isSprint: false, status: "finished" },
  { round: 10, name: "Belgian Grand Prix", nameZh: "比利时大奖赛", circuit: "Circuit de Spa-Francorchamps", dateStart: "2026-07-17", dateEnd: "2026-07-19", isSprint: false, status: "finished" },
  { round: 11, name: "Hungarian Grand Prix", nameZh: "匈牙利大奖赛", circuit: "Hungaroring", dateStart: "2026-07-24", dateEnd: "2026-07-26", isSprint: false, status: "finished" },
  { round: 12, name: "Dutch Grand Prix", nameZh: "荷兰大奖赛", circuit: "Circuit Park Zandvoort", dateStart: "2026-08-21", dateEnd: "2026-08-23", isSprint: false, status: "finished" },
  { round: 13, name: "Italian Grand Prix", nameZh: "意大利大奖赛", circuit: "Autodromo Nazionale Monza", dateStart: "2026-09-04", dateEnd: "2026-09-06", isSprint: false, status: "finished" },
  { round: 14, name: "Spanish Grand Prix", nameZh: "西班牙大奖赛", circuit: "Madring Circuit", dateStart: "2026-09-11", dateEnd: "2026-09-13", isSprint: false, status: "finished" },
  { round: 15, name: "Azerbaijan Grand Prix", nameZh: "阿塞拜疆大奖赛", circuit: "Baku City Circuit", dateStart: "2026-09-24", dateEnd: "2026-09-26", isSprint: false, status: "finished" },
  { round: 16, name: "Bahrain Grand Prix in Malaysia", nameZh: "雪邦特别大奖赛", circuit: "Sepang International Circuit", dateStart: "2026-10-02", dateEnd: "2026-10-04", isSprint: false, status: "finished" },
  { round: 17, name: "Singapore Grand Prix", nameZh: "新加坡大奖赛", circuit: "Marina Bay Street Circuit", dateStart: "2026-10-09", dateEnd: "2026-10-11", isSprint: true, status: "next" },
  { round: 18, name: "United States Grand Prix", nameZh: "美国大奖赛", circuit: "Circuit of the Americas", dateStart: "2026-10-23", dateEnd: "2026-10-25", isSprint: true, status: "upcoming" },
  { round: 19, name: "Mexico City Grand Prix", nameZh: "墨西哥大奖赛", circuit: "Autódromo Hermanos Rodríguez", dateStart: "2026-10-30", dateEnd: "2026-11-01", isSprint: false, status: "upcoming" },
  { round: 20, name: "São Paulo Grand Prix", nameZh: "圣保罗大奖赛", circuit: "Autódromo José Carlos Pace (Interlagos)", dateStart: "2026-11-06", dateEnd: "2026-11-08", isSprint: true, status: "upcoming" },
  { round: 21, name: "Las Vegas Grand Prix", nameZh: "拉斯维加斯大奖赛", circuit: "Las Vegas Strip Street Circuit", dateStart: "2026-11-20", dateEnd: "2026-11-22", isSprint: false, status: "upcoming" },
  { round: 22, name: "Qatar Grand Prix", nameZh: "卡塔尔大奖赛", circuit: "Lusail International Circuit", dateStart: "2026-11-27", dateEnd: "2026-11-29", isSprint: true, status: "upcoming" },
  { round: 23, name: "Abu Dhabi Grand Prix", nameZh: "阿布扎比大奖赛 (收官战)", circuit: "Yas Marina Circuit", dateStart: "2026-12-04", dateEnd: "2026-12-06", isSprint: false, status: "upcoming" }
];

export const FALLBACK_2026_DRIVERS = [
  { rank: 1, code: "ANT", number: "12", name: "基米·安东内利", nameEn: "Kimi Antonelli", fullZh: "基米·安东内利 (Kimi Antonelli)", team: "梅赛德斯车队 (Mercedes-AMG)", teamId: "mercedes", points: 320, wins: 4, gap: 0 },
  { rank: 2, code: "RUS", number: "63", name: "乔治·拉塞尔", nameEn: "George Russell", fullZh: "乔治·拉塞尔 (George Russell)", team: "梅赛德斯车队 (Mercedes-AMG)", teamId: "mercedes", points: 236, wins: 3, gap: -84 },
  { rank: 3, code: "HAM", number: "44", name: "刘易斯·汉密尔顿", nameEn: "Lewis Hamilton", fullZh: "刘易斯·汉密尔顿 (Lewis Hamilton)", team: "法拉利车队 (Scuderia Ferrari)", teamId: "ferrari", points: 214, wins: 2, gap: -106 },
  { rank: 4, code: "LEC", number: "16", name: "夏尔·勒克莱尔", nameEn: "Charles Leclerc", fullZh: "夏尔·勒克莱尔 (Charles Leclerc)", team: "法拉利车队 (Scuderia Ferrari)", teamId: "ferrari", points: 191, wins: 2, gap: -129 },
  { rank: 5, code: "NOR", number: "1", name: "兰多·诺里斯", nameEn: "Lando Norris", fullZh: "兰多·诺里斯 (Lando Norris)", team: "迈凯伦车队 (McLaren)", teamId: "mclaren", points: 188, wins: 2, gap: -132 },
  { rank: 6, code: "VER", number: "3", name: "马克斯·维斯塔潘", nameEn: "Max Verstappen", fullZh: "马克斯·维斯塔潘 (Max Verstappen)", team: "红牛车队 (Red Bull Racing)", teamId: "red_bull", points: 188, wins: 1, gap: -132 },
  { rank: 7, code: "PIA", number: "81", name: "奥斯卡·皮亚斯特里", nameEn: "Oscar Piastri", fullZh: "奥斯卡·皮亚斯特里 (Oscar Piastri)", team: "迈凯伦车队 (McLaren)", teamId: "mclaren", points: 128, wins: 0, gap: -192 },
  { rank: 8, code: "HAD", number: "6", name: "伊萨克·哈贾尔", nameEn: "Isack Hadjar", fullZh: "伊萨克·哈贾尔 (Isack Hadjar)", team: "红牛车队 (Red Bull Racing)", teamId: "red_bull", points: 96, wins: 0, gap: -224 }
];

export const FALLBACK_2026_CONSTRUCTORS = [
  { rank: 1, teamId: "mercedes", name: "梅赛德斯车队 (Mercedes-AMG)", nameEn: "Mercedes", points: 556, wins: 7, gap: 0 },
  { rank: 2, teamId: "ferrari", name: "法拉利车队 (Scuderia Ferrari)", nameEn: "Ferrari", points: 405, wins: 4, gap: -151 },
  { rank: 3, teamId: "mclaren", name: "迈凯伦车队 (McLaren)", nameEn: "McLaren", points: 316, wins: 2, gap: -240 },
  { rank: 4, teamId: "red_bull", name: "红牛车队 (Red Bull Racing)", nameEn: "Red Bull", points: 298, wins: 1, gap: -258 },
  { rank: 5, teamId: "rb", name: "小红牛车队 (Racing Bulls)", nameEn: "RB F1 Team", points: 90, wins: 0, gap: -466 }
];

export const FALLBACK_LAST_RACE = {
  round: 16,
  name: "Bahrain Grand Prix in Malaysia",
  nameZh: "雪邦特别大奖赛",
  circuitName: "雪邦国际赛道 (Sepang)",
  date: "2026-10-04",
  winner: {
    code: "VER",
    name: "马克斯·维斯塔潘",
    team: "红牛车队 (Red Bull Racing)",
    totalTime: "1:47:14.808 (56 圈)"
  },
  results: [
    { position: 1, code: "VER", driverName: "马克斯·维斯塔潘", teamName: "红牛车队", timeDelta: "1:47:14.808" },
    { position: 2, code: "ANT", driverName: "基米·安东内利", teamName: "梅赛德斯车队", timeDelta: "+2.307" },
    { position: 3, code: "HAM", driverName: "刘易斯·汉密尔顿", teamName: "法拉利车队", timeDelta: "+4.919" },
    { position: 4, code: "LEC", driverName: "夏尔·勒克莱尔", teamName: "法拉利车队", timeDelta: "+7.258" },
    { position: 5, code: "HAD", driverName: "伊萨克·哈贾尔", teamName: "红牛车队", timeDelta: "+8.571" }
  ],
  pole: {
    name: "基米·安东内利 (Kimi Antonelli)",
    team: "梅赛德斯车队",
    time: "1:31.285"
  },
  fastestLap: {
    name: "马克斯·维斯塔潘 (Max Verstappen)",
    team: "红牛车队",
    time: "1:33.914 (第 48 圈)"
  },
  safetyCarDeployments: 1,
  dnfCount: 2
};

export const FALLBACK_CURRENT_MEETING = {
  id: "round-17",
  season: "2026",
  round: 17,
  name: "Singapore Grand Prix",
  nameZh: "新加坡大奖赛",
  circuitId: "marina_bay",
  circuitName: "滨海湾市街赛道 (Marina Bay Street Circuit)",
  country: "新加坡",
  countryCode: "SGP",
  locality: "Marina Bay",
  dateStart: "2026-10-09",
  dateEnd: "2026-10-11",
  isSprint: true,
  raceStartUTC: "2026-10-11T12:00:00Z",
  sessions: [
    { id: "fp1-17", name: "第一次自由练习 (FP1)", nameEn: "Practice 1", type: "practice", startTimeUTC: "2026-10-09T08:30:00Z", durationMinutes: 60 },
    { id: "sq-17", name: "冲刺排位赛 (SQ)", nameEn: "Sprint Qualifying", type: "sprint_qualifying", startTimeUTC: "2026-10-09T12:30:00Z", durationMinutes: 44 },
    { id: "sprint-17", name: "冲刺赛 (Sprint)", nameEn: "Sprint", type: "sprint", startTimeUTC: "2026-10-10T09:00:00Z", durationMinutes: 60 },
    { id: "quali-17", name: "大奖赛排位赛 (Quali)", nameEn: "Qualifying", type: "qualifying", startTimeUTC: "2026-10-10T13:00:00Z", durationMinutes: 60 },
    { id: "race-17", name: "大奖赛正赛 (Race)", nameEn: "Grand Prix", type: "race", startTimeUTC: "2026-10-11T12:00:00Z", durationMinutes: 120 }
  ],
  specs: {
    lengthKm: "4.940",
    laps: 62,
    lapRecord: "1:34.486",
    turns: "19 (12左 / 7右)"
  }
};

// 完整权威 2026 官方分站赛历数据源（支持 start/end 与 dateStart/dateEnd 双向兼容）
export const F1_CALENDAR_2026 = FALLBACK_2026_CALENDAR.map(c => ({
  ...c,
  gp: c.nameZh || c.name,
  start: c.dateStart,
  end: c.dateEnd,
  country: c.nameZh ? c.nameZh.replace(/大奖赛.*$/, '') : '国际',
  countryCode: c.round === 17 ? 'SGP' : (c.round === 16 ? 'MYS' : 'FIA'),
  details: c.round === 17 
    ? '10-09 16:30 FP1 / 10-09 20:30 SQ / 10-10 17:00 Sprint / 10-10 21:00 Quali / 10-11 20:00 Race' 
    : `${c.dateStart} 自由练习 / ${c.dateEnd} 大奖赛正赛`
}));

export const FALLBACK_CALENDAR_2026 = F1_CALENDAR_2026;

export const DRIVERS_STANDINGS_2026 = FALLBACK_2026_DRIVERS.map(d => ({
  rank: d.rank,
  code: d.code,
  name: d.name,
  team: d.team,
  nat: d.code === 'ANT' ? 'ITA' : (d.code === 'RUS' || d.code === 'HAM' ? 'GBR' : (d.code === 'LEC' ? 'MON' : 'NED')),
  pts: d.points,
  wins: d.wins,
  gap: d.gap
}));

export const CONSTRUCTORS_STANDINGS_2026 = FALLBACK_2026_CONSTRUCTORS.map(c => ({
  rank: c.rank,
  code: c.teamId.toUpperCase().slice(0, 3),
  name: c.name,
  pts: c.points,
  gap: c.gap
}));
