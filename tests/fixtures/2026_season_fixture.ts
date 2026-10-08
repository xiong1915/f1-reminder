// tests/fixtures/2026_season_fixture.ts
// 仅供自动化单元测试与确定性回归测试使用的离线假定数据集 (严禁在生产运行时中直接引用以冒充真实赛事事实)

import { F1Meeting, DriverStanding, ConstructorStanding, RaceResultSummary } from '../../lib/f1/types';

export const FIXTURE_2026_CALENDAR = [
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

export const FIXTURE_2026_DRIVERS: DriverStanding[] = [
  { rank: 1, driverId: "antonelli", code: "ANT", number: "12", name: "基米·安东内利", nameEn: "Kimi Antonelli", fullZh: "基米·安东内利 (Kimi Antonelli)", team: "梅赛德斯车队 (Mercedes-AMG)", teamId: "mercedes", points: 320, wins: 4, gap: 0 },
  { rank: 2, driverId: "russell", code: "RUS", number: "63", name: "乔治·拉塞尔", nameEn: "George Russell", fullZh: "乔治·拉塞尔 (George Russell)", team: "梅赛德斯车队 (Mercedes-AMG)", teamId: "mercedes", points: 236, wins: 3, gap: -84 },
  { rank: 3, driverId: "hamilton", code: "HAM", number: "44", name: "刘易斯·汉密尔顿", nameEn: "Lewis Hamilton", fullZh: "刘易斯·汉密尔顿 (Lewis Hamilton)", team: "法拉利车队 (Scuderia Ferrari)", teamId: "ferrari", points: 214, wins: 2, gap: -106 },
  { rank: 4, driverId: "leclerc", code: "LEC", number: "16", name: "夏尔·勒克莱尔", nameEn: "Charles Leclerc", fullZh: "夏尔·勒克莱尔 (Charles Leclerc)", team: "法拉利车队 (Scuderia Ferrari)", teamId: "ferrari", points: 191, wins: 2, gap: -129 },
  { rank: 5, driverId: "norris", code: "NOR", number: "1", name: "兰多·诺里斯", nameEn: "Lando Norris", fullZh: "兰多·诺里斯 (Lando Norris)", team: "迈凯伦车队 (McLaren)", teamId: "mclaren", points: 188, wins: 2, gap: -132 },
  { rank: 6, driverId: "verstappen", code: "VER", number: "3", name: "马克斯·维斯塔潘", nameEn: "Max Verstappen", fullZh: "马克斯·维斯塔潘 (Max Verstappen)", team: "红牛车队 (Red Bull Racing)", teamId: "red_bull", points: 188, wins: 1, gap: -132 },
  { rank: 7, driverId: "piastri", code: "PIA", number: "81", name: "奥斯卡·皮亚斯特里", nameEn: "Oscar Piastri", fullZh: "奥斯卡·皮亚斯特里 (Oscar Piastri)", team: "迈凯伦车队 (McLaren)", teamId: "mclaren", points: 128, wins: 0, gap: -192 },
  { rank: 8, driverId: "hadjar", code: "HAD", number: "6", name: "伊萨克·哈贾尔", nameEn: "Isack Hadjar", fullZh: "伊萨克·哈贾尔 (Isack Hadjar)", team: "红牛车队 (Red Bull Racing)", teamId: "red_bull", points: 96, wins: 0, gap: -224 }
];

export const FIXTURE_2026_CONSTRUCTORS: ConstructorStanding[] = [
  { rank: 1, teamId: "mercedes", name: "梅赛德斯车队 (Mercedes-AMG)", nameEn: "Mercedes", points: 556, wins: 7, gap: 0 },
  { rank: 2, teamId: "ferrari", name: "法拉利车队 (Scuderia Ferrari)", nameEn: "Ferrari", points: 405, wins: 4, gap: -151 },
  { rank: 3, teamId: "mclaren", name: "迈凯伦车队 (McLaren)", nameEn: "McLaren", points: 316, wins: 2, gap: -240 },
  { rank: 4, teamId: "red_bull", name: "红牛车队 (Red Bull Racing)", nameEn: "Red Bull", points: 298, wins: 1, gap: -258 },
  { rank: 5, teamId: "rb", name: "小红牛车队 (Racing Bulls)", nameEn: "RB F1 Team", points: 90, wins: 0, gap: -466 }
];

export const FIXTURE_LAST_RACE: RaceResultSummary = {
  round: 16,
  season: "2026",
  name: "Bahrain Grand Prix in Malaysia",
  locality: "Sepang",
  date: "2026-10-04",
  winner: {
    code: "VER",
    name: "马克斯·维斯塔潘",
    team: "红牛车队 (Red Bull Racing)",
    time: "1:31:44.742"
  },
  podium: [
    { position: 1, code: "VER", name: "马克斯·维斯塔潘", team: "红牛车队" },
    { position: 2, code: "ANT", name: "基米·安东内利", team: "梅赛德斯车队" },
    { position: 3, code: "RUS", name: "乔治·拉塞尔", team: "梅赛德斯车队" }
  ],
  pole: { code: "ANT", name: "基米·安东内利" },
  fastestLap: { code: "VER", name: "马克斯·维斯塔潘", lapTime: "1:34.080" }
};
