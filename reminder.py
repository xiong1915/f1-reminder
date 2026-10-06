#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
F1 Race Reminder - 云端定时检测与微信推送脚本
支持 GitHub Actions 7x24 小时零服务器免费运行
"""

import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

# 北京时间时区 (UTC+8)
CST = timezone(timedelta(hours=8))

# 国家中文对照
COUNTRY_MAP = {
    "Bahrain": "巴林",
    "Saudi Arabia": "沙特阿拉伯",
    "Australia": "澳大利亚",
    "Japan": "日本",
    "China": "中国",
    "United States": "美国",
    "Italy": "意大利",
    "Monaco": "摩纳哥",
    "Canada": "加拿大",
    "Spain": "西班牙",
    "Austria": "奥地利",
    "Great Britain": "英国",
    "United Kingdom": "英国",
    "Hungary": "匈牙利",
    "Belgium": "比利时",
    "Netherlands": "荷兰",
    "Azerbaijan": "阿塞拜疆",
    "Singapore": "新加坡",
    "Mexico": "墨西哥",
    "Brazil": "巴西",
    "Qatar": "卡塔尔",
    "United Arab Emirates": "阿联酋",
}

# 赛道地点对照
LOCATION_MAP = {
    "Sakhir": "萨基尔 (巴林国际赛道)",
    "Jeddah": "吉达 (吉达滨海赛道)",
    "Melbourne": "墨尔本 (阿尔伯特公园赛道)",
    "Suzuka": "铃鹿 (铃鹿赛道)",
    "Shanghai": "上海 (上海国际赛车场)",
    "Miami": "迈阿密 (迈阿密国际赛道)",
    "Imola": "伊莫拉 (恩佐与迪诺·法拉利赛道)",
    "Monaco": "蒙特卡洛 (摩纳哥赛道)",
    "Montreal": "蒙特利尔 (吉尔·维伦纽夫赛道)",
    "Barcelona": "巴塞罗那 (加泰罗尼亚赛道)",
    "Spielberg": "施皮尔贝格 (红牛环赛道)",
    "Silverstone": "银石 (银石赛道)",
    "Budapest": "布达佩斯 (亨格罗宁赛道)",
    "Spa": "斯帕 (斯帕-弗朗科尔尚赛道)",
    "Zandvoort": "赞德福特 (赞德福特赛道)",
    "Monza": "蒙扎 (蒙扎国家赛车场)",
    "Baku": "巴库 (巴库城市赛道)",
    "Marina Bay": "滨海湾 (滨海湾市街赛道)",
    "Austin": "奥斯汀 (美洲赛道 COTA)",
    "Mexico City": "墨西哥城 (罗德里格斯兄弟赛道)",
    "Sao Paulo": "圣保罗 (若泽·卡洛斯·帕塞赛道)",
    "Las Vegas": "拉斯维加斯 (拉斯维加斯大道赛道)",
    "Lusail": "卢塞尔 (卢塞尔国际赛车场)",
    "Yas Marina": "亚斯码头 (亚斯码头赛道)",
}

# 环节名称对照
SESSION_MAP = {
    "Practice 1": "第一次自由练习赛 (FP1)",
    "Practice 2": "第二次自由练习赛 (FP2)",
    "Practice 3": "第三次自由练习赛 (FP3)",
    "Qualifying": "排位赛 (Qualifying)",
    "Sprint Qualifying": "冲刺排位赛 (Sprint Quali)",
    "Sprint Shootout": "冲刺排位赛 (Sprint Shootout)",
    "Sprint": "冲刺赛 (Sprint Race)",
    "Race": "正赛 (Grand Prix Race)",
}


def translate_country(name):
    return COUNTRY_MAP.get(name, name)


def translate_location(loc):
    return LOCATION_MAP.get(loc, loc)


def translate_session(sess):
    return SESSION_MAP.get(sess, sess)


def get_f1_sessions(year):
    url = f"https://api.openf1.org/v1/sessions?year={year}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "F1ReminderBot/1.0", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except Exception as e:
        print(f"[警告] 从 OpenF1 拉取 {year} 赛季数据失败: {e}")
        return []


def send_pushplus(token, title, content, channel="wechat"):
    url = "http://www.pushplus.plus/send"
    payload = {
        "token": token,
        "title": title,
        "content": content,
        "channel": channel,
        "template": "markdown" if channel != "clawbot" else "txt",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = resp.read().decode("utf-8")
        print(f"[Pushplus 响应] {res}")
        return True


def send_serverchan(key, title, content):
    if not key.startswith("http"):
        url = f"https://sctapi.ftqq.com/{key}.send"
    else:
        url = key
    payload = {"title": title, "desp": content}
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = resp.read().decode("utf-8")
        print(f"[Server酱 响应] {res}")
        return True


def send_wecom(url, grand_prix, session_name, location, time_str, rem_min):
    content = f"""### 🏎️ F1 比赛即将开赛提醒 (前30分钟)
> **大奖赛**：<font color="comment">{grand_prix}</font>
> **环节**：<font color="info">{session_name}</font>
> **赛道**：{location}
> **开赛时间**：{time_str} (北京时间)
> **距离开赛**：<font color="warning">约 {rem_min} 分钟</font>

🏁 请各位车迷准备就绪，比赛即将打响！
"""
    payload = {"msgtype": "markdown", "markdown": {"content": content}}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = resp.read().decode("utf-8")
        print(f"[企业微信 响应] {res}")
        return True


def dispatch_push(push_key, grand_prix, session_name, location, time_str, rem_min):
    title = f"🏎️ F1 开赛提醒: {grand_prix} - {session_name}"
    content = f"""### 🏎️ F1 比赛即将开始提醒 (30分钟前)
- **🏆 大奖赛**：{grand_prix}
- **⏱️ 环节**：{session_name}
- **📍 赛道地点**：{location}
- **⏰ 开赛时间**：{time_str} (北京时间)
- **⏳ 距离开赛**：约 **{rem_min} 分钟**

🏁 五盏红灯熄灭，精彩即将开赛，请做好观赛准备！
"""
    if "qyapi.weixin.qq.com" in push_key:
        return send_wecom(push_key, grand_prix, session_name, location, time_str, rem_min)
    elif "sctapi.ftqq.com" in push_key or push_key.startswith("SCT"):
        return send_serverchan(push_key, title, content)
    else:
        # 默认作为 Pushplus Token 或 Webhook
        token = push_key.strip()
        channel = os.getenv("PUSHPLUS_CHANNEL", "wechat")
        return send_pushplus(token, title, content, channel=channel)


def main():
    push_key = os.getenv("PUSH_KEY", "").strip()
    if not push_key and os.path.exists("config.json"):
        try:
            with open("config.json", "r", encoding="utf-8") as f:
                cfg = json.load(f)
                push_key = cfg.get("webhook_url", "").strip()
        except Exception:
            pass

    if not push_key:
        print("[错误] 未配置 PUSH_KEY！请在 GitHub Secrets 或 config.json 中设置。")
        sys.exit(1)

    # 读取历史推送记录
    history_file = "history.json"
    sent_history = {}
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                sent_history = json.load(f)
        except Exception:
            sent_history = {}

    now_utc = datetime.now(timezone.utc)
    now_cst = now_utc.astimezone(CST)
    print("=" * 45)
    print(f"当前时间 (北京时间): {now_cst.strftime('%Y-%m-%d %H:%M:%S')}")

    # 获取本年及必要时次年赛程
    current_year = now_cst.year
    sessions = get_f1_sessions(current_year)
    if now_cst.month >= 11:
        sessions += get_f1_sessions(current_year + 1)

    if not sessions:
        print("[提示] 暂未获取到赛程数据。")
        return

    # 监控的环节类别
    monitored_types = ["Practice", "Qualifying", "Sprint", "Race"]

    # 排序筛选未来赛程
    upcoming = []
    for s in sessions:
        dt_str = s.get("date_start")
        if not dt_str:
            continue
        try:
            st = datetime.fromisoformat(dt_str)
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            # 过滤3小时前已完赛的
            if st >= now_utc - timedelta(hours=3):
                sess_key = str(s.get("session_key", f"{s.get('year')}_{s.get('country_name')}_{s.get('session_name')}_{dt_str}"))
                diff_minutes = (st - now_utc).total_seconds() / 60.0
                upcoming.append({
                    "session": s,
                    "start_time": st,
                    "key": sess_key,
                    "diff": diff_minutes,
                })
        except Exception:
            continue

    upcoming.sort(key=lambda x: x["start_time"])

    if not upcoming:
        print("[提示] 本赛季已无后续赛程。")
        return

    # 打印下一场比赛信息
    next_s = upcoming[0]
    next_cst = next_s["start_time"].astimezone(CST)
    c_name = translate_country(next_s["session"].get("country_name", ""))
    s_name = translate_session(next_s["session"].get("session_name", ""))
    loc_name = translate_location(next_s["session"].get("location", ""))
    diff_m = next_s["diff"]
    h_left = int(diff_m // 60)
    m_left = int(diff_m % 60)

    print(f"最近下一场赛事: {c_name} 大奖赛 - {s_name}")
    print(f"开赛时间: {next_cst.strftime('%Y-%m-%d %H:%M:%S')} (北京时间)")
    if diff_m > 0:
        print(f"距开赛还剩: {h_left} 小时 {m_left} 分钟 ({round(diff_m, 1)} 分钟)")
    else:
        print(f"赛事正在进行中或刚开赛！")
    print("-" * 45)

    # 提醒触发窗口：开赛前 15 ~ 35 分钟（针对定时 15 分钟触发的最佳匹配）
    # 如果处于 [0, 35] 分钟区间且未推送，则触发
    ADVANCE_TARGET = 30
    TOLERANCE = 15  # 15 ~ 45 分钟内均可触发推送

    triggered = 0
    for item in upcoming:
        s = item["session"]
        s_type = s.get("session_type", "")
        s_name_raw = s.get("session_name", "")

        is_match = any(m in s_type or m in s_name_raw for m in monitored_types)
        if not is_match:
            continue

        diff = item["diff"]
        key = item["key"]

        # 触发区间：开赛前 -2 到 35 分钟
        if -2 <= diff <= (ADVANCE_TARGET + TOLERANCE):
            if key in sent_history:
                print(f"[已提醒过] {c_name} - {s_name}")
                continue

            # 触发推送
            c_name_cn = translate_country(s.get("country_name", ""))
            loc_cn = translate_location(s.get("location", ""))
            s_name_cn = translate_session(s.get("session_name", ""))
            gp_name = f"{c_name_cn} 大奖赛 ({s.get('country_name')} GP)"
            start_str = item["start_time"].astimezone(CST).strftime("%Y-%m-%d %H:%M:%S")
            rem_min = max(1, round(diff))

            print(f">>> 满足开赛前 30 分钟条件！正在推送: {gp_name} - {s_name_cn}")
            try:
                success = dispatch_push(push_key, gp_name, s_name_cn, loc_cn, start_str, rem_min)
                if success:
                    sent_history[key] = {
                        "sent_at": now_cst.strftime("%Y-%m-%d %H:%M:%S"),
                        "grand_prix": gp_name,
                        "session": s_name_cn,
                        "start_time": start_str,
                    }
                    triggered += 1
            except Exception as e:
                print(f"[推送失败] {e}")

    # 保存历史记录
    if triggered > 0:
        try:
            with open(history_file, "w", encoding="utf-8") as f:
                json.dump(sent_history, f, ensure_ascii=False, indent=2)
            print(f"已更新已发送历史文件: {history_file}")
        except Exception as e:
            print(f"[保存历史失败] {e}")
    else:
        print(f"当前时间没有处于开赛前 30 分钟窗口内的比赛环节。")
    print("=" * 45)


if __name__ == "__main__":
    main()
