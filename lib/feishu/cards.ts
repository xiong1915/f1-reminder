// lib/feishu/cards.ts
// 飞书交互式卡片渲染构建器 (支持 F1 与通用会话定制化按钮、数据溯源与深色模板)

import { AISource } from '../ai/types';

export interface CardBuildParams {
  replyText: string;
  isF1?: boolean;
  sources?: AISource[];
  searchFailed?: boolean;
}

export function buildResponseCard(params: CardBuildParams) {
  const { replyText, isF1 = false, sources = [], searchFailed = false } = params;

  let cardTitle = "🤖 智能助手";
  let cardTemplate = "blue";
  let footnote = "";

  if (sources.length > 0) {
    cardTitle = isF1 ? "🏎️ TIKE F1 智能助手 (已联网溯源)" : "🤖 智能助手 (已联网检索)";
    cardTemplate = "turquoise";
    const sourceList = sources.slice(0, 3).map((s, idx) => {
      return s.url ? `• [${idx + 1}] [${s.name}](${s.url})` : `• [${idx + 1}] ${s.name}`;
    }).join('\n');
    footnote = `\n\n---\n**数据溯源**：\n${sourceList}`;
  } else if (searchFailed) {
    cardTitle = isF1 ? "🏎️ TIKE F1 (⚠️ 联网检索失败)" : "🤖 智能助手 (⚠️ 检索失败)";
    cardTemplate = "orange";
    footnote = "\n\n---\n**⚠️ 检索降级**：未能获取最新互联网数据，基于已知权威赛历与模型推理";
  } else {
    cardTitle = isF1 ? "🏎️ TIKE F1 智能助手" : "🤖 智能助手";
    cardTemplate = "blue";
    footnote = "\n\n---\n*TIKE 智能引擎*";
  }

  const actionButtons: any[] = [];
  if (isF1) {
    actionButtons.push(
      {
        tag: "button",
        text: { tag: "plain_text", content: "⏱️ 本站各节时间" },
        type: "primary",
        value: { action: "f1_session_times" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "📅 2026 年度赛历" },
        type: "default",
        value: { action: "f1_full_calendar" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "🗑️ 清空上下文" },
        type: "danger",
        value: { action: "reset_context" }
      }
    );
  } else {
    actionButtons.push(
      {
        tag: "button",
        text: { tag: "plain_text", content: "🔄 重新生成" },
        type: "default",
        value: { action: "regenerate" }
      },
      {
        tag: "button",
        text: { tag: "plain_text", content: "🗑️ 清空上下文" },
        type: "danger",
        value: { action: "reset_context" }
      }
    );
  }

  return {
    header: {
      title: { tag: "plain_text", content: cardTitle },
      template: cardTemplate
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `${replyText}${footnote}`
        }
      },
      {
        tag: "action",
        actions: actionButtons
      }
    ]
  };
}

export const buildFeishuCard = buildResponseCard;
