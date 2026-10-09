// components/markdown_renderer.tsx
// 纯 React 渲染的零依赖安全 Markdown 渲染组件 (防 XSS、零外部注入风险、高对比度排版)

'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkdownRenderer({ content, className, style }: MarkdownRendererProps) {
  if (!content) return null;

  // 按行分割进行轻量安全块级解析
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listKey = `list-${elements.length}`;
    elements.push(
      <ListTag
        key={listKey}
        style={{
          paddingLeft: '22px',
          margin: '8px 0',
          lineHeight: '1.7',
          color: 'var(--text-primary, #ffffff)'
        }}
      >
        {currentList.items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '4px' }}>
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // 1. 代码块围栏判定
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <div
            key={`code-${elements.length}`}
            style={{
              margin: '12px 0',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {codeBlockLang && (
              <div
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  color: 'var(--text-muted, #8e8e93)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  fontFamily: 'monospace'
                }}
              >
                {codeBlockLang}
              </div>
            )}
            <pre
              style={{
                padding: '12px',
                margin: 0,
                overflowX: 'auto',
                fontSize: '13px',
                fontFamily: 'var(--font-mono, monospace)',
                color: '#e5e5ea',
                lineHeight: 1.5
              }}
            >
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
        continue;
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // 2. 空行
    if (!line.trim()) {
      flushList();
      continue;
    }

    // 3. 分割线
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      flushList();
      elements.push(
        <hr
          key={`hr-${elements.length}`}
          style={{
            border: 'none',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            margin: '16px 0'
          }}
        />
      );
      continue;
    }

    // 4. 标题解析
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          style={{
            fontSize: '16px',
            fontWeight: 700,
            margin: '14px 0 6px',
            color: 'var(--text-primary, #ffffff)'
          }}
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          style={{
            fontSize: '18px',
            fontWeight: 800,
            margin: '18px 0 8px',
            color: 'var(--text-primary, #ffffff)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '4px'
          }}
        >
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          style={{
            fontSize: '20px',
            fontWeight: 800,
            margin: '20px 0 10px',
            color: 'var(--text-primary, #ffffff)'
          }}
        >
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      continue;
    }

    // 5. 无序列表 (- 或 * 开头)
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    // 6. 有序列表 (数字. 开头)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // 7. 引用行 (> 开头)
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          style={{
            borderLeft: '3px solid var(--accent-red, #ff2d20)',
            paddingLeft: '12px',
            margin: '10px 0',
            color: 'var(--text-secondary, #aeaeb2)',
            fontStyle: 'italic',
            background: 'rgba(255, 45, 32, 0.04)',
            padding: '6px 12px',
            borderRadius: '0 6px 6px 0'
          }}
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 8. 普通段落
    flushList();
    elements.push(
      <p
        key={`p-${elements.length}`}
        style={{
          margin: '6px 0',
          lineHeight: 1.68,
          color: 'var(--text-primary, #ffffff)'
        }}
      >
        {renderInlineMarkdown(line)}
      </p>
    );
  }

  flushList();

  return (
    <div className={className} style={{ ...style, wordBreak: 'break-word' }}>
      {elements}
    </div>
  );
}

/**
 * 递归解析行内加粗 (**bold**)、行内代码 (`code`) 等元素
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // 匹配 **bold** 或 `code`
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--accent-red, #ff453a)'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
