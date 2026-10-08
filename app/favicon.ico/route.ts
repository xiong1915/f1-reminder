// app/favicon.ico/route.ts
export const dynamic = 'force-static';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#000000"/>
  <path d="M6 24 L16 8 L20 14 L12 24 Z" fill="#e10600"/>
  <path d="M19 15 L26 24 L21 24 L16.5 18 Z" fill="#ffffff"/>
  <circle cx="25" cy="9" r="2" fill="#e10600"/>
</svg>`;

export async function GET() {
  return new Response(ICON_SVG, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
