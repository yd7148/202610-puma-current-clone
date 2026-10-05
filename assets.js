/* ============================================================
   assets.js — 用「程序」生成 SVG，而不是畫一張圖
   為什麼？因為跑馬燈條、波浪背景都是「可無縫平鋪的幾何」，
   用數學生成 tile 尺寸才能對齊循環動畫。
   這是原站最值得學的一招。
   ============================================================ */

/** 取 SVG → 可塞進 CSS 的 data URI（只編碼必要字元） */
export function svgURI(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
}

/* ---------- 1. 跑馬燈條 tile ----------
   寬度必須與 CSS animation 的位移量一致，否則會「跳一下」。
   這裡刻意算出一個非整數寬 594.2px 來示範這個陷阱。 */
export function stripSVG() {
  const W = 594.2, H = 34;
  const items = [
    { t: 'FUTURE ', style: 'italic' },
    { t: 'SOON', style: 'italic' },
    { t: '→' },
    { t: 'THE TAIPEI CURRENT' },
    { t: '→' },
    { t: 'FUTURE ', style: 'italic' },
    { t: 'SOON', style: 'italic' },
  ];
  // 手工排版：一段文字節點一個 <text>，寬度靠固定 x 前進
  let x = 10, out = '';
  const adv = [46, 42, 26, 168, 26, 46, 42];
  items.forEach((it, i) => {
    const f = it.style ? 'italic' : 'normal';
    out += `<text x="${x}" y="23" font-family="Arial Black, Arial, sans-serif" font-size="15" font-weight="900" font-style="${f}" fill="#fff">${it.t}</text>`;
    x += adv[i];
  });
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out}</svg>`);
}

/* ---------- 2. 旗幟波浪 tile ----------
   核心：用 <filter><feGaussianBlur> 把方波「糊成」正弦波。
   一層淡白 + 一層深棕，兩層速度不同 → 產生布料飄動感。 */
function waveTile(W, H, period, amp, blur, fills) {
  // 用兩個互補的正弦拼出一條粗帶，上下對齊形成可平鋪的無縫帶
  const steps = 40;
  let top = '', bot = '';
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = amp * Math.sin((2 * Math.PI * x) / period);
    top += `${i ? 'L' : 'M'}${x.toFixed(1)},${(H / 2 + y).toFixed(1)} `;
  }
  bot = 'L' + W + ',' + H + ' L0,' + H + ' Z';
  const bands = fills.map(f =>
    `<path d="${top}${bot}" fill="${f.c}" fill-opacity="${f.o}"/>`
  ).join('');
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="b" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>
<g filter="url(#b)">${bands}</g></svg>`);
}

/* ---------- 3. 標題兩側的「浪」符號 ---------- */
export function waveMarkSVG() {
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="24" viewBox="0 0 60 24">
<g fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round">
<path d="M2 6c6-4 12 4 18 0s12 4 18 0 12 4 18 0"/>
<path d="M2 13c6-4 12 4 18 0s12 4 18 0 12 4 18 0" stroke-width="3.5"/>
<path d="M8 20c5-3 10 3 15 0s10 3 15 0 10 3 15 0" stroke-width="2.5"/>
</g></svg>`);
}

/* ---------- 一次性注入 CSS 變數 ---------- */
export function installAssets(root = document.documentElement) {
  root.style.setProperty('--strip', stripSVG());
  root.style.setProperty('--strip-w', '594.2px');
  root.style.setProperty('--wave-mark', waveMarkSVG());
  root.style.setProperty('--wave-a',
    waveTile(520, 1400, 520, 90, 34, [{ c: '#fff', o: 0.19 }, { c: '#5a1400', o: 0.13 }]));
  root.style.setProperty('--wave-b',
    waveTile(780, 2000, 780, 130, 50, [{ c: '#fff', o: 0.12 }, { c: '#5a1400', o: 0.09 }]));
}