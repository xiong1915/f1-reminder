// lib/search/filter.ts
// 搜索候选结果相关性与实体严格筛选器

import { SearchResultItem } from './types';
import { checkUrlSafety } from './url_safety';

export interface FilterContext {
  query: string;
  season?: string;
  round?: number;
  meetingName?: string;
  isOfficialOnly?: boolean;
}

// 严禁混入的非赛车体育项目
const NON_F1_SPORTS_REGEX = /(乒乓球|国乒|WTT|世乒赛|羽毛球|中超|西甲|英超|德甲|意甲|欧冠|亚冠|CBA|NBA|排球|女排|女足|男篮|男排|台球|斯诺克|网球|澳网|温网|法网|美网|游泳|田径)/i;

// 垃圾与低质内容标记
const SPAM_REGEX = /(直播在线观看免费|免费观看入口|高清无插件|下载APP|手机端入口|官网入口|app下载|买球|竞彩|开奖结果|破解版)/i;

/**
 * 对搜索返回的原始候选列表进行主题、运动、赛季、分站、场次及安全性深度清洗与打分排序
 */
export function filterAndRankCandidates(
  items: SearchResultItem[],
  context: FilterContext
): SearchResultItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const qLower = context.query.toLowerCase();
  const isSingaporeQuery = /(新加坡|marina bay|滨海湾)/i.test(context.query);
  const isQualiQuery = /(排位|杆位|qualifying|pole)/i.test(context.query);
  const isSprintQuery = /(冲刺|sprint)/i.test(context.query);
  const isRaceQuery = /(正赛|分站冠军|grand prix|race)/i.test(context.query);
  const isHamiltonQuery = /(汉密尔顿|hamilton)/i.test(context.query);
  const isFerrariQuery = /(法拉利|ferrari)/i.test(context.query);

  const filtered: { item: SearchResultItem; score: number }[] = [];
  const seenUrls = new Set<string>();

  for (const item of items) {
    const rawUrl = item.url || '';
    const title = item.title || '';
    const snippet = item.snippet || '';
    const combinedText = `${title} ${snippet}`.toLowerCase();

    // 1. 安全性与来源合法性校验
    const safety = checkUrlSafety(rawUrl);
    if (!safety.safe) continue;

    const normalizedUrl = safety.normalizedUrl;
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    // 2. 彻底剔除垃圾/黑产/直播广告
    if (SPAM_REGEX.test(title) || SPAM_REGEX.test(snippet)) continue;

    // 3. 彻底过滤非赛车体育
    if (NON_F1_SPORTS_REGEX.test(title) || NON_F1_SPORTS_REGEX.test(snippet)) continue;

    // 4. 若用户明确要求官方来源，严格仅保留经核实的官方发布机构
    if (context.isOfficialOnly && !safety.isOfficial) {
      continue;
    }

    // 5. 主题与分站相关性校验
    let score = 0;

    // 官方机构拥有最高基础权重
    if (safety.isOfficial) score += 50;
    if (safety.sourceType === 'mainstream_media') score += 20;

    // 分站特定相关性校验：若用户询问特定分站，淘汰完全不提及目标分站的无关内容
    const targetMeeting = context.meetingName || (
      isSingaporeQuery ? '新加坡' :
      /(巴林|bahrain)/i.test(context.query) ? '巴林' :
      /(银石|silverstone)/i.test(context.query) ? '银石' :
      /(蒙扎|monza)/i.test(context.query) ? '蒙扎' :
      /(上海|中国大奖赛|shanghai)/i.test(context.query) ? '上海' :
      /(日本|铃鹿|suzuka)/i.test(context.query) ? '铃鹿' :
      undefined
    );

    if (targetMeeting) {
      const aliases: Record<string, RegExp> = {
        新加坡: /singapore|marina bay|滨海湾|新加坡/i, 巴林: /bahrain|sakhir|巴林/i,
        英国: /british|silverstone|英国|银石/i, 银石: /british|silverstone|英国|银石/i,
        中国: /chinese|china|shanghai|上海|中国/i, 上海: /chinese|china|shanghai|上海|中国/i,
        日本: /japan|japanese|suzuka|日本|铃鹿/i, 铃鹿: /japan|japanese|suzuka|日本|铃鹿/i,
        澳大利亚: /australia|albert park|墨尔本|澳大利亚/i, 摩纳哥: /monaco|摩纳哥/i,
        意大利: /italian|italy|monza|蒙扎|意大利/i, 美国: /united states|austin|americas|美国|奥斯汀/i,
        阿布扎比: /abu dhabi|yas marina|阿布扎比/i
      };
      const mentionsTarget = combinedText.includes(targetMeeting.toLowerCase()) ||
        !!aliases[targetMeeting]?.test(combinedText) ||
        (targetMeeting === '新加坡' && /(marina bay|滨海湾)/i.test(combinedText)) ||
        (targetMeeting === '巴林' && /sakhir/i.test(combinedText)) ||
        (targetMeeting === '上海' && /(上赛|中国站)/i.test(combinedText)) ||
        (targetMeeting === '铃鹿' && /suzuka/i.test(combinedText));
      if (!mentionsTarget) {
        continue; // 不含用户指定分站，坚决淘汰
      }
      score += 35;
    }

    // 排位赛特定相关性校验
    if (isQualiQuery) {
      if (/(排位|杆位|qualifying|pole)/i.test(combinedText)) {
        score += 25;
      }
    }

    // 冲刺赛特定相关性校验
    if (isSprintQuery) {
      if (/(冲刺|sprint)/i.test(combinedText)) {
        score += 25;
      }
    }

    // 汉密尔顿 / 法拉利转会查询相关性校验
    if (isHamiltonQuery || isFerrariQuery) {
      if (/(汉密尔顿|hamilton)/i.test(combinedText)) score += 20;
      if (/(法拉利|ferrari)/i.test(combinedText)) score += 20;
      if (/(加盟|转投|签约|官宣|announcement|join)/i.test(combinedText)) score += 20;
    }

    // 包含 F1 / 一级方程式 实体加分
    if (/(f1|一级方程式|formula 1)/i.test(combinedText)) {
      score += 10;
    }

    // 赛季年份相关性加分
    const targetSeason = context.season || context.query.match(/(19\d\d|20\d\d)/)?.[1];
    if (targetSeason) {
      const mentionedYears: string[] = combinedText.match(/\b(?:19|20)\d{2}\b/g) || [];
      if (mentionedYears.length && !mentionedYears.includes(targetSeason)) continue;
    }
    if (targetSeason && combinedText.includes(targetSeason)) {
      score += 15;
    }

    // 规避自媒体充当官方
    const sourceLabel = safety.isOfficial
      ? '官方公告'
      : (safety.sourceType === 'mainstream_media' ? '主流媒体' : '网络资讯/自媒体');

    filtered.push({
      item: {
        ...item,
        url: normalizedUrl,
        source: sourceLabel,
        isOfficial: safety.isOfficial,
        sourceType: safety.sourceType
      },
      score
    });
  }

  // 按得分由高到低降序排列
  filtered.sort((a, b) => b.score - a.score);
  return filtered.map(f => f.item);
}
