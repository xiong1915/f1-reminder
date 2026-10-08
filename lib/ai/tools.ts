// lib/ai/tools.ts
// 受控服务端 Tools 白名单实现，禁止模型访问任意未授权 URL 与高危操作

import { AITool } from './types';
import { defaultF1Service } from '../../providers/f1/service';
import { defaultSearchService } from '../search/service';
import { simulateTitleScenario } from '../f1/championship';

export const AI_WHITELIST_TOOLS: AITool[] = [
  {
    name: 'get_next_race',
    description: '获取 2026 赛季当前或下一站 F1 大奖赛的准确赛程、赛道及各节练习/排位/正赛时间 (UTC与北京时间)',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_race_calendar',
    description: '获取 2026 赛季全部分站赛历、轮次 (Round) 与举办地列表',
    parameters: {
      type: 'object',
      properties: {
        season: { type: 'string', description: '赛季年份，如 2026' }
      }
    }
  },
  {
    name: 'get_standings',
    description: '获取 2026 赛季 F1 车手积分榜 (Drivers) 或车队积分榜 (Constructors)',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['drivers', 'constructors'], description: '积分榜类型' }
      },
      required: ['type']
    }
  },
  {
    name: 'get_latest_result',
    description: '获取最近一场已结束的 F1 大奖赛的冠军、领奖台与最快圈速结果',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_f1_news',
    description: '通过官方免费新闻渠道 (GDELT / RSS) 检索最新的 F1 或国际动态',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '新闻关键词' }
      },
      required: ['query']
    }
  },
  {
    name: 'explain_f1_regulation',
    description: '查询 F1 权威竞赛规则 (例如积分体系、冲刺赛规则、轮胎使用限制、安全车流程、DRS 激活规则)',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', enum: ['points', 'sprint', 'tires', 'safety_car', 'drs', 'engine_penalty'], description: '规则主题' }
      },
      required: ['topic']
    }
  },
  {
    name: 'simulate_title_scenario',
    description: '执行确定性数学推演，计算争冠对手在不同排位/正赛/冲刺完赛名次下的最新分差走向',
    parameters: {
      type: 'object',
      properties: {
        leaderCode: { type: 'string', description: '榜首车手三字简称，如 ANT' },
        challengerCode: { type: 'string', description: '追赶者车手三字简称，如 RUS' },
        leaderRacePos: { type: 'number', description: '假设领跑者正赛名次 (1-20)' },
        challengerRacePos: { type: 'number', description: '假设追赶者正赛名次 (1-20)' }
      },
      required: ['leaderCode', 'challengerCode', 'leaderRacePos', 'challengerRacePos']
    }
  }
];

export async function executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
  switch (name) {
    case 'get_next_race': {
      const overview = await defaultF1Service.getOverview();
      return {
        round: overview.currentMeeting.round,
        name: overview.currentMeeting.name,
        nameZh: overview.currentMeeting.nameZh,
        circuit: overview.currentMeeting.circuitName,
        locality: overview.currentMeeting.locality,
        isSprint: overview.currentMeeting.isSprintWeekend,
        sessions: overview.currentMeeting.sessions,
        nextSession: overview.nextSession
      };
    }
    case 'get_race_calendar': {
      const season = args.season || '2026';
      const calendar = await defaultF1Service.getCalendar(season);
      return calendar.map(m => ({
        round: m.round,
        name: m.nameZh || m.name,
        locality: m.locality,
        circuit: m.circuitName,
        date: m.raceStartUTC,
        isSprint: m.isSprintWeekend
      }));
    }
    case 'get_standings': {
      if (args.type === 'constructors') {
        const cs = await defaultF1Service.getConstructorStandings('2026');
        return cs.slice(0, 10);
      }
      const ds = await defaultF1Service.getDriverStandings('2026');
      return ds.slice(0, 10);
    }
    case 'get_latest_result': {
      return defaultF1Service.getLastRaceResult();
    }
    case 'search_f1_news': {
      const query = args.query || 'F1';
      return defaultSearchService.search(query);
    }
    case 'explain_f1_regulation': {
      const topic = args.topic;
      const REGULATION_DATABASE: Record<string, string> = {
        points: '正赛积分规则：前十名依次获得 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 分。最快圈速若在正赛前十名完赛则获得额外 1 分。',
        sprint: '冲刺赛积分规则：前八名依次获得 8, 7, 6, 5, 4, 3, 2, 1 分。冲刺赛无最快圈速加分。',
        tires: '干地比赛期间，车手必须至少使用两种不同配方的干地轮胎（软胎/中性胎/硬胎），除非遇到雨地宣布为 Wet Race。',
        safety_car: '安全车 (Safety Car) 出动时，全场进入限速 Delta。被套圈车辆可在赛会指示后超越安全车解套。',
        drs: 'DRS (可变阻力翼) 仅在距离前车 1.0 秒以内且在特定检测点与激活区内允许开启。雨天或比赛开始前两圈默认禁用。',
        engine_penalty: '超出赛季规定动力单元配额 (ICE, TC, MGU-K, MGU-H, ES, CE) 首次超额罚退 10 位，后续超额罚退 5 位；累计超过 15 位则直接罚至队尾发车。'
      };
      return { topic, explanation: REGULATION_DATABASE[topic] || '未检索到该特定条款说明。' };
    }
    case 'simulate_title_scenario': {
      const drivers = await defaultF1Service.getDriverStandings('2026');
      const leader = drivers.find(d => d.code === args.leaderCode) || drivers[0];
      const challenger = drivers.find(d => d.code === args.challengerCode) || drivers[1];

      if (!leader || !challenger) {
        return { error: '未找到对应车手数据' };
      }

      return simulateTitleScenario({
        leader: { name: leader.name, code: leader.code, points: leader.points },
        challenger: { name: challenger.name, code: challenger.code, points: challenger.points },
        leaderRace: args.leaderRacePos,
        challengerRace: args.challengerRacePos
      });
    }
    default:
      throw new Error(`Tool '${name}' is not in whitelist.`);
  }
}
