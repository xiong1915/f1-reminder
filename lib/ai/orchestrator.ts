// lib/ai/orchestrator.ts
// TIKE 核心 AI 编排器 (Web 与 Feishu 统一共享 AI Core，支持 AbortSignal 取消防护)

import { AIMessage, AIRequest, AIResponse, AIStreamEvent, AISource, AIFactCard } from './types';
import { defaultAIService } from './service';
import { defaultF1Service } from '../../providers/f1/service';
import { defaultSearchService } from '../search/service';
import { getBeijingTime, formatBeijingDisplay } from '../f1/time';

export type UserIntent = 'F1_FACTUAL' | 'F1_ANALYSIS' | 'F1_NEWS' | 'GENERAL';

export class AIOrchestrator {
  /**
   * 意图路由器：统一将用户问题分类为 4 大意图
   */
  classifyIntent(text: string): UserIntent {
    const q = (text || '').trim().toLowerCase();

    // 1. 显式新闻意图
    if (/(新闻|头条|最新消息|资讯|快讯|发生|news)/i.test(q)) {
      return 'F1_NEWS';
    }

    // 2. F1 事实类意图 (下一站、赛历、几点开赛、当前榜首、上一站冠军、积分情况)
    if (/(下一场|下一站|什么时候开赛|赛程|赛历|几号|几点|积分榜|排名|排第几|谁是第一|多少分|领跑|上一场|上站|谁赢了|冠军是|领奖台)/i.test(q)) {
      if (/(f1|一级方程式|汉密尔顿|维斯塔潘|勒克莱尔|诺里斯|安东内利|拉塞尔|皮亚斯特里|法拉利|梅赛德斯|迈凯伦|红牛|大奖赛)/i.test(q) || /(下一站|下一场|开赛|积分榜|站)/i.test(q)) {
        return 'F1_FACTUAL';
      }
    }

    // 3. F1 独有专业战术/技术术语 (无需附带 "F1" 字样即可判定为 F1 分析)
    const hasExclusiveF1Term = /(undercut|overcut|drs|地面效应|安全车|虚拟安全车|vsc|排位赛|冲刺赛|杆位|进站策略|换胎策略)/i.test(q);
    if (hasExclusiveF1Term) {
      return 'F1_ANALYSIS';
    }

    // 4. F1 实体与泛策略/工程规则结合
    const hasF1Entity = /(f1|一级方程式|formula 1|fia|大奖赛|赛车|车队|车手|梅赛德斯|法拉利|红牛|迈凯伦|阿斯顿马丁|威廉姆斯|奥迪|哈斯|小红牛|汉密尔顿|维斯塔潘|勒克莱尔|诺里斯|安东内利|拉塞尔|皮亚斯特里)/i.test(q);
    const hasTechnicalOrRule = /(为什么|策略|换胎|进站|规则|引擎|底盘|升级|空气动力|套件|争冠)/i.test(q);

    if (hasTechnicalOrRule && hasF1Entity) {
      return 'F1_ANALYSIS';
    }

    // 5. 其他包含 F1 关键字的默认进入 F1 分析
    if (hasF1Entity) {
      return 'F1_ANALYSIS';
    }

    // 5. 通用对话 (绝不强行注入 F1 赛事数据，保持领域隔离)
    return 'GENERAL';
  }

  /**
   * 构建带有确定性事实的 System Prompt
   */
  async buildPrompt(intent: UserIntent, query: string): Promise<{ systemPrompt: string; sources: AISource[] }> {
    const bjTime = getBeijingTime();
    const sources: AISource[] = [];

    if (intent === 'GENERAL') {
      return {
        systemPrompt: `你是一个博学、克制、专业的 AI 智能助手。
当前基准时间：${bjTime}。
请以简体中文简洁回答用户问题。请根据用户提问内容直接作答，若用户未提及 F1 或赛车，严禁主动引入 F1 或赛车话题。`,
        sources
      };
    }

    // 获取权威 2026 F1 核心数据与全赛季赛历
    const [overview, calendar] = await Promise.all([
      defaultF1Service.getOverview(),
      defaultF1Service.getCalendar('2026').catch(() => [])
    ]);
    const curr = overview.currentMeeting;
    const nextS = overview.nextSession;
    const top3 = overview.driverStandings.slice(0, 3);
    const lastR = overview.previousRace;

    const qLower = query.toLowerCase();

    // 智能检索用户是否询问特定分站
    const matchedMeeting = calendar.find(m => {
      return (m.nameZh && qLower.includes(m.nameZh.toLowerCase())) ||
        (m.name && qLower.includes(m.name.toLowerCase().replace(' grand prix', ''))) ||
        (m.locality && qLower.includes(m.locality.toLowerCase())) ||
        (m.country && qLower.includes(m.country.toLowerCase())) ||
        (m.circuitName && qLower.includes(m.circuitName.toLowerCase()));
    });

    // 智能检索用户是否询问特定车手
    const mentionedDrivers = overview.driverStandings.filter(d => {
      return (d.name && qLower.includes(d.name.toLowerCase())) ||
        (d.nameEn && qLower.includes(d.nameEn.toLowerCase())) ||
        (d.code && query.toUpperCase().includes(d.code)) ||
        (d.driverId && qLower.includes(d.driverId.toLowerCase()));
    });

    // 智能检索用户是否询问特定车队
    const mentionedTeams = overview.constructorStandings.filter(t => {
      return (t.name && qLower.includes(t.name.toLowerCase())) ||
        (t.nameEn && qLower.includes(t.nameEn.toLowerCase())) ||
        (t.teamId && qLower.includes(t.teamId.toLowerCase()));
    });

    let contextText = `【TIKE F1 权威 2026 赛季事实基准】
- 当前基准时间：${bjTime} (UTC+8)
- 当前进行/下一站：第 ${curr.round} 站 ${curr.nameZh || curr.name} (${curr.locality} · ${curr.circuitName})
  正赛时间：${formatBeijingDisplay(curr.raceStartUTC)} (北京时间)
  下一节动态：${nextS.session?.name || 'Grand Prix'} (${nextS.status === 'IN_PROGRESS' ? '正在进行中' : (nextS.session?.startTimeUTC ? formatBeijingDisplay(nextS.session.startTimeUTC) : '待定')})
- 当前车手积分榜前三：
  1. ${top3[0]?.name || '榜首车手'} (${top3[0]?.team || '车队'}) - ${top3[0]?.points || 0} 分
  2. ${top3[1]?.name || '第二名'} (${top3[1]?.team || '车队'}) - ${top3[1]?.points || 0} 分 (差 ${Math.abs(top3[1]?.gap || 0)} 分)
  3. ${top3[2]?.name || '第三名'} (${top3[2]?.team || '车队'}) - ${top3[2]?.points || 0} 分`;

    if (matchedMeeting && matchedMeeting.round !== curr.round) {
      contextText += `\n\n【用户询问的目标分站权威赛程】
- 第 ${matchedMeeting.round} 站 ${matchedMeeting.nameZh || matchedMeeting.name} (${matchedMeeting.locality} · ${matchedMeeting.circuitName})
  正赛时间：${formatBeijingDisplay(matchedMeeting.raceStartUTC)} (北京时间)
  周末类型：${matchedMeeting.isSprintWeekend ? '包含冲刺赛 (Sprint Weekend)' : '常规比赛周末'}
  各节详细时间：
${matchedMeeting.sessions.map(s => `  * ${s.name}: ${formatBeijingDisplay(s.startTimeUTC)}`).join('\n')}`;
    }

    if (mentionedDrivers.length > 0) {
      contextText += `\n\n【用户提及车手的当前战绩与积分】\n` +
        mentionedDrivers.map(d => `* P${d.rank} ${d.name} (${d.team})：${d.points} 分，分站胜场：${d.wins || 0}，落后领跑者：${Math.abs(d.gap)} 分`).join('\n');
    }

    if (mentionedTeams.length > 0) {
      contextText += `\n\n【用户提及车队的积分榜情况】\n` +
        mentionedTeams.map(t => `* P${t.rank} ${t.name}：${t.points} 分，胜场：${t.wins || 0}，分差：${Math.abs(t.gap)} 分`).join('\n');
    }

    sources.push({ name: 'TIKE F1 权威数据引擎' });

    if (lastR) {
      contextText += `\n- 上一站比赛：第 ${lastR.round} 站 ${lastR.name}，冠军：${lastR.winner.name} (${lastR.winner.team})`;
    }

    // 新闻意图额外注入实时免费新闻检索结果
    if (intent === 'F1_NEWS') {
      const searchRes = await defaultSearchService.search(query);
      if (searchRes.success && searchRes.results.length > 0) {
        contextText += `\n\n【最新外部要闻溯源 (${searchRes.provider})】：`;
        for (const item of searchRes.results.slice(0, 4)) {
          contextText += `\n- ${item.title}: ${item.snippet}`;
          sources.push({ name: item.title, url: item.url });
        }
      }
    }

    const systemPrompt = `你是 TIKE · F1 Race Intelligence 官方 AI 智能引擎。
具备权威一级方程式赛车工程洞察、实时赛季数据及赛事规则认知。
语言风格保持专业、克制、数据驱动，类似于高端汽车媒体或围场策略工程师。
若回答包含赛程、时间、车手排名或积分，必须严格依据以下提供的权威事实，严禁虚构：

${contextText}

若用户提问关于规则或战术，提供深度技术解释。使用简体中文作答。`;

    return { systemPrompt, sources };
  }

  /**
   * 结构化事实快通道 (F1 Fact Fast Path)：由 Canonical F1 Core 数据层即时直出结构化卡片
   */
  getFactCard(intent: UserIntent, query: string, overview: any, calendar?: any[]): AIFactCard | null {
    if (intent !== 'F1_FACTUAL') return null;
    const curr = overview.currentMeeting;
    const nextS = overview.nextSession;
    const top3 = overview.driverStandings.slice(0, 3);
    const lastR = overview.previousRace;

    const qLower = query.toLowerCase();

    // 优先匹配具体提及的目标分站
    if (calendar && calendar.length > 0) {
      const matched = calendar.find(m => {
        return (m.nameZh && qLower.includes(m.nameZh.toLowerCase())) ||
          (m.name && qLower.includes(m.name.toLowerCase().replace(' grand prix', ''))) ||
          (m.locality && qLower.includes(m.locality.toLowerCase()));
      });
      if (matched && matched.round !== curr.round) {
        return {
          type: 'next_race',
          title: `第 ${matched.round} 站 ${matched.nameZh || matched.name}`,
          badge: matched.locality,
          fields: [
            { label: '举办赛道', value: matched.circuitName },
            { label: '正赛时间', value: `${formatBeijingDisplay(matched.raceStartUTC)} (北京时间)` },
            { label: '周末类型', value: matched.isSprintWeekend ? '冲刺周末 (含冲刺赛)' : '常规周末' }
          ]
        };
      }
    }

    // 匹配具体提及的车手
    if (overview.driverStandings && overview.driverStandings.length > 0) {
      const matchedDriver = overview.driverStandings.find((d: any) =>
        (d.name && qLower.includes(d.name.toLowerCase())) ||
        (d.nameEn && qLower.includes(d.nameEn.toLowerCase())) ||
        (d.code && query.toUpperCase().includes(d.code))
      );
      if (matchedDriver && /积分|排名|第几|成绩|多少分/i.test(query)) {
        return {
          type: 'standings',
          title: `车手战况：${matchedDriver.name}`,
          badge: `P${matchedDriver.rank}`,
          fields: [
            { label: '所属车队', value: matchedDriver.team },
            { label: '赛季积分', value: `${matchedDriver.points} 分` },
            { label: '分站胜场', value: `${matchedDriver.wins || 0} 胜` },
            { label: '领跑差距', value: matchedDriver.gap === 0 ? '领跑积分榜' : `落后 ${Math.abs(matchedDriver.gap)} 分` }
          ]
        };
      }
    }

    if (/下一[场站]|几点|什么时候|赛程|开赛/i.test(query)) {
      return {
        type: 'next_race',
        title: `第 ${curr.round} 站 ${curr.nameZh || curr.name}`,
        badge: curr.locality,
        fields: [
          { label: '举办赛道', value: curr.circuitName },
          { label: '正赛时间', value: `${formatBeijingDisplay(curr.raceStartUTC)} (北京时间)` },
          { label: '当前下一节', value: `${nextS.session?.name || '正赛'} (${nextS.status === 'IN_PROGRESS' ? '进行中' : formatBeijingDisplay(nextS.session?.startTimeUTC || '')})` }
        ]
      };
    }

    if (/积分|榜首|排名/i.test(query)) {
      return {
        type: 'standings',
        title: '2026 赛季车手积分榜前三',
        badge: 'FIA 官方核定',
        fields: top3.map((d: any) => ({
          label: `P${d.rank} ${d.name}`,
          value: `${d.team} · ${d.points} 分 (差 ${d.gap === 0 ? '领跑' : Math.abs(d.gap) + ' 分'})`
        }))
      };
    }

    if (/上[一站场]|冠军/i.test(query) && lastR) {
      return {
        type: 'previous_race',
        title: `上一站：第 ${lastR.round} 站 ${lastR.nameZh || lastR.name}`,
        badge: '完赛',
        fields: [
          { label: '分站冠军', value: `${lastR.winner.name} (${lastR.winner.team})` },
          { label: '举办地点', value: lastR.locality },
          { label: '成绩记录', value: lastR.winner.time || '完赛' }
        ]
      };
    }

    return null;
  }

  /**
   * 离线确定性兜底回复 (当模型服务暂未配置 Key 或网络完全不可用时)
   */
  getDeterministicResponse(intent: UserIntent, query: string, overview: any, calendar?: any[]): string {
    const curr = overview.currentMeeting;
    const nextS = overview.nextSession;
    const top3 = overview.driverStandings.slice(0, 3);
    const lastR = overview.previousRace;

    const qLower = query.toLowerCase();

    // 优先为提及的特定分站返回确定性赛程
    if (calendar && calendar.length > 0) {
      const matched = calendar.find(m => {
        return (m.nameZh && qLower.includes(m.nameZh.toLowerCase())) ||
          (m.name && qLower.includes(m.name.toLowerCase().replace(' grand prix', ''))) ||
          (m.locality && qLower.includes(m.locality.toLowerCase()));
      });
      if (matched && matched.round !== curr.round) {
        return `【第 ${matched.round} 站 ${matched.nameZh || matched.name} 赛程信息】\n举办地：${matched.locality} · ${matched.circuitName}\n正赛时间：${formatBeijingDisplay(matched.raceStartUTC)} (北京时间)\n周末类型：${matched.isSprintWeekend ? '包含冲刺赛' : '常规大奖赛'}\n各环节时间：\n` +
          matched.sessions.map((s: any) => `  * ${s.name}: ${formatBeijingDisplay(s.startTimeUTC)}`).join('\n');
      }
    }

    // 优先为提及的具体车手返回确定性战况
    if (overview.driverStandings && overview.driverStandings.length > 0) {
      const matchedDriver = overview.driverStandings.find((d: any) =>
        (d.name && qLower.includes(d.name.toLowerCase())) ||
        (d.nameEn && qLower.includes(d.nameEn.toLowerCase())) ||
        (d.code && query.toUpperCase().includes(d.code))
      );
      if (matchedDriver && /积分|排名|第几|成绩|多少分/i.test(query)) {
        return `【车手战报】\n姓名：${matchedDriver.name} (${matchedDriver.nameEn})\n车队：${matchedDriver.team}\n当前排名：P${matchedDriver.rank}\n积分：${matchedDriver.points} 分 (落后榜首 ${Math.abs(matchedDriver.gap)} 分)\n胜场：${matchedDriver.wins || 0}`;
      }
    }

    if (intent === 'F1_FACTUAL') {
      if (/下一[场站]|几点|什么时候/i.test(query)) {
        return `【下一场 F1 比赛信息】\n分站：第 ${curr.round} 站 ${curr.nameZh || curr.name} (${curr.locality} · ${curr.circuitName})\n正赛时间：${formatBeijingDisplay(curr.raceStartUTC)} (北京时间)\n当前下一节：${nextS.session?.name || 'Grand Prix'} (${nextS.status === 'IN_PROGRESS' ? '进行中' : formatBeijingDisplay(nextS.session?.startTimeUTC || '')})`;
      }
      if (/积分|榜首|排名/i.test(query)) {
        const topList = top3.map((d: any) => `${d.rank}. ${d.name} (${d.team}) - ${d.points} 分`).join('\n');
        return `【当前 2026 赛季车手积分榜前三】\n${topList}`;
      }
      if (/上[一站场]|冠军/i.test(query) && lastR) {
        return `【上一站比赛结果】\n第 ${lastR.round} 站 ${lastR.name} (${lastR.locality})\n冠军车手：${lastR.winner.name} (${lastR.winner.team})\n用时：${lastR.winner.time || '完赛'}`;
      }
    }

    return `当前 TIKE AI 引擎服务就绪。若需启用大模型实时生成，请在服务端配置 DEEPSEEK_API_KEY。`;
  }

  /**
   * 执行完整的生成
   */
  async answer(messages: AIMessage[], clientKey?: string, signal?: AbortSignal): Promise<{ reply: string; sources: AISource[] }> {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMsg?.content || '';

    const intent = this.classifyIntent(query);
    const { systemPrompt, sources } = await this.buildPrompt(intent, query);

    const fullMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system')
    ];

    try {
      const response = await defaultAIService.generate({
        messages: fullMessages,
        temperature: intent === 'F1_FACTUAL' ? 0.2 : 0.7,
        signal
      }, undefined, clientKey);

      return {
        reply: response.content,
        sources
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return { reply: '', sources: [] };
      }
      console.warn(`[AIOrchestrator] Model generation fallback: ${err.message}`);
      const [overview, calendar] = await Promise.all([
        defaultF1Service.getOverview(),
        defaultF1Service.getCalendar('2026').catch(() => [])
      ]);
      return {
        reply: this.getDeterministicResponse(intent, query, overview, calendar),
        sources
      };
    }
  }

  /**
   * 执行流式生成
   */
  async *streamAnswer(messages: AIMessage[], clientKey?: string, signal?: AbortSignal): AsyncIterable<AIStreamEvent> {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMsg?.content || '';

    const intent = this.classifyIntent(query);
    const { systemPrompt, sources } = await this.buildPrompt(intent, query);

    if (sources.length > 0) {
      yield { type: 'sources', sources };
    }

    // F1 事实快通道 (Fact Fast Path): 结构化卡片直出，杜绝模型覆盖或幻觉
    let factCardYielded = false;
    if (intent === 'F1_FACTUAL') {
      try {
        const [overview, calendar] = await Promise.all([
          defaultF1Service.getOverview(),
          defaultF1Service.getCalendar('2026').catch(() => [])
        ]);
        const factCard = this.getFactCard(intent, query, overview, calendar);
        if (factCard) {
          yield { type: 'fact_card', factCard };
          factCardYielded = true;
        }
      } catch (_) {}
    }

    const fullMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system')
    ];

    try {
      let hasTokens = false;
      for await (const chunk of defaultAIService.stream({
        messages: fullMessages,
        temperature: intent === 'F1_FACTUAL' ? 0.2 : 0.7,
        signal
      }, undefined, clientKey)) {
        if (chunk.type === 'error') {
          throw new Error(chunk.error || 'stream error');
        }
        hasTokens = true;
        yield chunk;
      }
      if (!hasTokens) throw new Error('Empty model output');
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return;
      }
      console.warn(`[AIOrchestrator] Stream fallback: ${err.message}`);
      const [overview, calendar] = await Promise.all([
        defaultF1Service.getOverview(),
        defaultF1Service.getCalendar('2026').catch(() => [])
      ]);
      const text = this.getDeterministicResponse(intent, query, overview, calendar);
      if (!factCardYielded) {
        yield { type: 'delta', content: text };
      } else {
        yield { type: 'delta', content: '\n\n【权威事实已通过 Fast Path 即时呈现】' };
      }
      yield { type: 'done' };
    }
  }
}

export const defaultAIOrchestrator = new AIOrchestrator();
