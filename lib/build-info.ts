// lib/build-info.ts
// APEX V3 构建指纹与运行时版本信息

export const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  'apex-v3-605c56c';

export const BUILD_ENV = process.env.NODE_ENV || 'production';
export const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || '2026-10-08T22:12:00Z';
