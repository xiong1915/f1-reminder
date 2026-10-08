// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'TIKE · F1 Race Intelligence & Championship Platform',
  description: '一级方程式赛车数据与赛事分析平台。实时分站倒计时、车手与车队积分榜及 AI 问答。',
  keywords: ['F1', 'Formula 1', 'TIKE', '2026 F1', '一级方程式', '赛车', '赛历', '积分榜'],
  openGraph: {
    title: 'TIKE · F1 Race Intelligence',
    description: '一级方程式赛车数据与赛事分析平台。',
    type: 'website',
    url: 'https://f1.tike69.cc.cd'
  },
  icons: {
    icon: '/icon.svg'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0b'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
