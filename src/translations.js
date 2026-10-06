// src/translations.js - F1 赛程与地理信息中英文对照字典与翻译辅助函数

const COUNTRY_MAP = {
  "Bahrain": "巴林", "Saudi Arabia": "沙特阿拉伯", "Australia": "澳大利亚", "Japan": "日本",
  "China": "中国", "United States": "美国", "Italy": "意大利", "Monaco": "摩纳哥",
  "Canada": "加拿大", "Spain": "西班牙", "Austria": "奥地利", "Great Britain": "英国",
  "Hungary": "匈牙利", "Belgium": "比利时", "Netherlands": "荷兰", "Azerbaijan": "阿塞拜疆",
  "Singapore": "新加坡", "Mexico": "墨西哥", "Brazil": "巴西", "Qatar": "卡塔尔",
  "United Arab Emirates": "阿联酋"
};

const LOCATION_MAP = {
  "Sakhir": "萨基尔 (巴林国际赛道)", "Jeddah": "吉达 (吉达滨海赛道)",
  "Melbourne": "墨尔本 (阿尔伯特公园赛道)", "Suzuka": "铃鹿 (铃鹿赛道)",
  "Shanghai": "上海 (上海国际赛车场)", "Miami": "迈阿密 (迈阿密国际赛道)",
  "Imola": "伊莫拉 (恩佐与迪诺·法拉利赛道)", "Monaco": "蒙特卡洛 (摩纳哥赛道)",
  "Montreal": "蒙特利尔 (吉尔·维伦纽夫赛道)", "Barcelona": "巴塞罗那 (加泰罗尼亚赛道)",
  "Spielberg": "施皮尔贝格 (红牛环赛道)", "Silverstone": "银石 (银石赛道)",
  "Budapest": "布达佩斯 (亨格罗宁赛道)", "Spa": "斯帕 (斯帕-弗朗科尔尚赛道)",
  "Zandvoort": "赞德福特 (赞德福特赛道)", "Monza": "蒙扎 (蒙扎国家赛车场)",
  "Baku": "巴库 (巴库城市赛道)", "Marina Bay": "滨海湾 (滨海湾市街赛道)",
  "Austin": "奥斯汀 (美洲赛道 COTA)", "Mexico City": "墨西哥城 (罗德里格斯兄弟赛道)",
  "Sao Paulo": "圣保罗 (若泽·卡洛斯·帕塞赛道)", "Las Vegas": "拉斯维加斯 (拉斯维加斯大道赛道)",
  "Lusail": "卢塞尔 (卢塞尔国际赛车场)", "Yas Marina": "亚斯码头 (亚斯码头赛道)"
};

const SESSION_MAP = {
  "Practice 1": "第一次自由练习赛 (FP1)", "Practice 2": "第二次自由练习赛 (FP2)",
  "Practice 3": "第三次自由练习赛 (FP3)", "Qualifying": "排位赛 (Qualifying)",
  "Sprint Qualifying": "冲刺排位赛 (Sprint Quali)", "Sprint Shootout": "冲刺排位赛 (Sprint Shootout)",
  "Sprint": "冲刺赛 (Sprint Race)", "Race": "大奖赛正赛 (Main Race)"
};

function translateCountry(c) { return COUNTRY_MAP[c] || c; }
function translateLocation(l) { return LOCATION_MAP[l] || l; }
function translateSession(s) { return SESSION_MAP[s] || s; }

module.exports = {
  COUNTRY_MAP,
  LOCATION_MAP,
  SESSION_MAP,
  translateCountry,
  translateLocation,
  translateSession
};
