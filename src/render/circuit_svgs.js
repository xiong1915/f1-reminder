// src/render/circuit_svgs.js
// 赛道矢量资产库：半透明空间深度、发车线、弯道流线

export function getCircuitSvg(circuitId = 'marina_bay') {
  if (circuitId === 'marina_bay') {
    return `<svg viewBox="0 0 500 320" fill="none" xmlns="http://www.w3.org/2000/svg" class="circuit-track-svg">
      <path d="M 120 260 L 190 260 L 220 240 L 250 240 L 270 220 L 310 220 L 340 190 L 380 160 L 420 150 L 440 120 L 430 90 L 390 70 L 340 70 L 310 50 L 260 50 L 230 70 L 190 70 L 160 100 L 130 100 L 100 130 L 90 170 L 100 210 Z" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 120 260 L 190 260 L 220 240 L 250 240 L 270 220 L 310 220 L 340 190 L 380 160 L 420 150 L 440 120 L 430 90 L 390 70 L 340 70 L 310 50 L 260 50 L 230 70 L 190 70 L 160 100 L 130 100 L 100 130 L 90 170 L 100 210 Z" stroke="rgba(255,45,32,0.18)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="145" y1="250" x2="145" y2="270" stroke="#ff2d20" stroke-width="4" stroke-linecap="round"/>
      <text x="145" y="290" fill="#86868b" font-size="10" font-family="monospace" letter-spacing="1">START / FINISH</text>
    </svg>`;
  }

  // 默认通用赛道曲线
  return `<svg viewBox="0 0 500 320" fill="none" xmlns="http://www.w3.org/2000/svg" class="circuit-track-svg">
    <path d="M 100 220 C 150 260 300 260 380 220 C 440 180 440 100 380 70 C 300 30 180 40 120 90 C 80 130 80 180 100 220 Z" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="240" y1="235" x2="240" y2="255" stroke="#ff2d20" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
