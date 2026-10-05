/* ============================================================
   art.js — 帆船 / 錨 的兩種向量繪法
   ============================================================
   A 版「木刻墨線」：以 stroke 為主，粗黑線 + 手繪抖動 + 乾刷紋
   B 版「幾何扁平」：以 fill 為主，無描邊，錯色塊假造立體
   兩版刻意用「不同建構方式」而非「同一張圖調色」，
   才有得比較哪種更貼近原站的印刷感。
   ============================================================ */

const ORANGE = '#ea611d';
const DEEP   = '#b8420c';   // 暗橘（假造陰影）
const CREAM  = '#f4efe6';
const INK    = '#15171c';

/* ---------- 手繪抖動：讓直線不直 ----------
   技巧：把線段切成數段，每段加一個微量偏移並用 Q 曲線連接。
   振幅只要 1~2px，肉眼看起來就是「人手畫的」，不會變成鋸齒。 */
function wobbler(seed) {
  let s = seed;
  const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const j = a => (r() - 0.5) * 2 * a;

  /** 一條抖動直線 */
  const line = (x1, y1, x2, y2, a = 2) => {
    const n = 4, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + j(a), y1 + (y2 - y1) * t + j(a)]);
    }
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += `Q${f(pts[i][0])},${f(pts[i][1])} ${f(mx)},${f(my)}`;
    }
    const L = pts[pts.length - 1];
    return d + `L${f(L[0])},${f(L[1])}`;
  };

  /** 一條抖動曲線（取樣正弦波） */
  const curve = (x1, y1, x2, y2, bow, a = 2.2) => {
    const n = 10, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + j(a), y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * bow + j(a)]);
    }
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], q = pts[i - 1];
      d += `Q${f(p[0])},${f(p[1])} ${f((p[0] + q[0]) / 2)},${f((p[1] + q[1]) / 2)}`;
    }
    const L = pts[pts.length - 1];
    return d + `L${f(L[0])},${f(L[1])}`;
  };
  return { r, j, line, curve };
}
const f = v => Math.round(v * 10) / 10;

/* ---------- 乾刷紋：木刻感的來源 ----------
   一堆極細短線。關鍵：必須放在 <g clip-path> 內，
   否則會噴到船外變成亂髮（實測踩過）。 */
function grain(seed, x, y, w, h, count = 90, color = CREAM, op = 0.5) {
  const { r } = wobbler(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const gx = x + r() * w, gy = y + r() * h;
    const len = 5 + r() * 26, ang = (r() - 0.5) * 0.35;
    out += `<line x1="${f(gx)}" y1="${f(gy)}" x2="${f(gx + Math.cos(ang) * len)}" y2="${f(gy + Math.sin(ang) * len)}" `
        + `stroke="${color}" stroke-width="${f(0.7 + r() * 1.4)}" opacity="${f(op * (0.3 + r() * 0.7))}"/>`;
  }
  return out;
}

/* ============================================================
   船體幾何（共用）
   ------------------------------------------------------------
   教訓：不要用「每個零件自己算絕對座標」，
   那樣零件之間一定對不齊。改成：
     1. 定義一個船體形狀
     2. 所有裝飾都畫在「船體局部座標」裡
     3. 裝飾一律 clip 在船體形狀內
     4. 最後整組 translate + rotate，船自然傾斜
   ============================================================ */
/* 船體：寬高比約 3:1，船頭(左)微微上揚，船尾(右)較高 */
const HULL = 'M44,168 L150,150 L400,150 L528,160 L516,224 L340,272 L128,242 L50,196 Z';
const CLIP_ID = 'hullClip';

/* ============================================================
   帆船 — A 版：木刻墨線
   viewBox 0 0 560 360
   ============================================================ */
function boatInk() {
  const w = wobbler(7717);
  const SW = 6;

  return `<g>
  <!-- 統一座標系：先定船體軸線，所有零件都相對它定位 -->
  <g transform="translate(6,22) rotate(-6 280 190)">
    <defs><clipPath id="${CLIP_ID}"><path d="${HULL}"/></clipPath></defs>

    <!-- 船體底色 -->
    <path d="${HULL}" fill="${ORANGE}"/>

    <!-- ↓ 以下全部夾在船體內，絕不會噴出輪廓 -->
    <g clip-path="url(#${CLIP_ID})">
      <!-- 甲板奶油帶 -->
      <path d="M20,150 L560,150 L560,180 L20,180 Z" fill="${CREAM}"/>
      <!-- 背光面 -->
      <path d="M250,246 L560,196 L560,290 L230,300 Z" fill="${DEEP}"/>
      <!-- 船板縫：全部在 clip 內 → 不會穿出 -->
      <g stroke="${INK}" stroke-width="3.2" fill="none" opacity=".58">
        <path d="${w.curve(40,206,520,206,2)}"/>
        <path d="${w.curve(60,238,500,238,2)}"/>
      </g>
      <!-- 乾刷紋：夾在船內 -->
      ${grain(101, 60, 196, 450, 74, CREAM, .5)}
      ${grain(202, 60, 196, 450, 74, INK, .2)}
      ${grain(303, 40, 152, 500, 28, INK, .12)}
    </g>

    <!-- 墨線描邊（最後畫，蓋住底色邊緣） -->
    <path d="${HULL}" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>

    <!-- 繩索：沿舷弧 -->
    <path d="M60,196 C170,218 280,236 380,244" stroke="${CREAM}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M60,196 C170,218 280,236 380,244" stroke="${INK}" stroke-width="2" fill="none" stroke-dasharray="8 10"/>

    <!-- 圓舷窗：坐在船體中線上 -->
    <g>
      <circle cx="182" cy="222" r="26" fill="${INK}"/>
      <circle cx="182" cy="222" r="17" fill="${CREAM}"/>
      <circle cx="182" cy="222" r="8" fill="${ORANGE}"/>
      <circle cx="278" cy="240" r="23" fill="${INK}"/>
      <circle cx="278" cy="240" r="14" fill="${CREAM}"/>
      <circle cx="278" cy="240" r="7" fill="${ORANGE}"/>
    </g>

    <!-- 艙房：底邊貼齊甲板帶 y=180 -->
    <path d="M240,180 L404,180 L398,90 L246,90 Z" fill="${CREAM}"/>
    <path d="M240,180 L404,180" stroke="${INK}" stroke-width="${SW}" stroke-linecap="round"/>
    <path d="M246,90 L398,90" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <g fill="${INK}">
      <rect x="260" y="110" width="26" height="42"/>
      <rect x="296" y="110" width="26" height="42"/>
      <rect x="332" y="110" width="26" height="42"/>
      <rect x="366" y="110" width="20" height="42"/>
    </g>
    <g stroke="${CREAM}" stroke-width="3" opacity=".9">
      <path d="M264,146 L280,114"/>
      <path d="M300,146 L316,114"/>
    </g>

    <!-- 桅杆：立在艙房上 -->
    <path d="M336,90 L340,-2" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M330,22 L404,22" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>

    <!-- 三角帆：左邊貼桅杆，底邊貼甲板 -->
    <path d="M338,4 L338,86 L222,86 Z" fill="${ORANGE}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M234,78 L330,78 L330,18" stroke="${CREAM}" stroke-width="4" fill="none"/>
    <text x="292" y="54" fill="${CREAM}" font-size="26" font-weight="900" font-style="italic"
          text-anchor="middle" font-family="Arial Black,Arial">SOON</text>
    <text x="292" y="82" fill="${CREAM}" font-size="30" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">鉄</text>
    ${grain(303, 228, 8, 102, 70, CREAM, .3)}

    <!-- 舵輪 -->
    <g transform="translate(444,126)">
      <circle r="32" fill="${CREAM}" stroke="${INK}" stroke-width="5"/>
      <g stroke="${INK}" stroke-width="4.5" stroke-linecap="round">
        ${Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return `<line x1="${f(Math.cos(a) * 8)}" y1="${f(Math.sin(a) * 8)}" x2="${f(Math.cos(a) * 30)}" y2="${f(Math.sin(a) * 30)}"/>`;
        }).join('')}
      </g>
      <circle r="9" fill="${INK}"/>
    </g>

    <!-- 直幅「鉄流」：立在船尾甲板上 -->
    <path d="M474,6 L552,6 L548,164 L470,164 Z" fill="${ORANGE}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M490,6 L490,-10" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M480,22 L544,22" stroke="${CREAM}" stroke-width="5"/>
    <text x="510" y="72" fill="${CREAM}" font-size="50" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">鉄</text>
    <text x="510" y="132" fill="${CREAM}" font-size="50" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">流</text>
    ${grain(404, 478, 26, 70, 128, CREAM, .28)}

    <!-- 尾舵 + 螺旋槳 -->
    <path d="M524,172 L566,178 L560,220 L518,214 Z" fill="${INK}"/>
    <path d="M496,200 L496,232" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="496" cy="240" rx="17" ry="10" fill="${INK}"/>
  </g>
</g>`;
}

/* ============================================================
   帆船 — B 版：幾何扁平
   特色：不描邊，用「錯開的暗色塊」假造厚度與光源。
   ============================================================ */
function boatFlat() {
  // 與 A 版共用同一個船體形狀 → 差異只在「畫法」，不在造型
  return `<g>
  <g transform="translate(6,22) rotate(-6 280 190)">
    <defs><clipPath id="hullClipB"><path d="${HULL}"/></clipPath></defs>

    <!-- 硬陰影：整組錯開，純黑低透明（無模糊 = B 版的特徵） -->
    <g transform="translate(8,9)" opacity=".22">
      <path d="${HULL}" fill="${INK}"/>
    </g>

    <!-- 船體三個受光面 -->
    <path d="${HULL}" fill="${ORANGE}"/>
    <g clip-path="url(#hullClipB)">
      <path d="M20,148 L560,148 L560,180 L20,180 Z" fill="${CREAM}"/>       <!-- 甲板帶 -->
      <path d="M250,246 L560,196 L560,300 L230,310 Z" fill="${DEEP}"/>       <!-- 背光 -->
      <path d="M20,60 L152,60 L162,300 L20,300 Z" fill="#f5873f"/>            <!-- 受光 -->
      <!-- 板縫 = 細長矩形（工業製圖感） -->
      <g fill="${INK}" opacity=".5">
        <path d="M30,204 L540,204 L540,209 L30,209 Z"/>
        <path d="M50,236 L520,236 L520,241 L50,241 Z"/>
      </g>
    </g>

    <!-- 繩索 -->
    <path d="M60,196 C170,218 280,236 380,244" stroke="${CREAM}" stroke-width="9" fill="none" stroke-linecap="round"/>

    <!-- 舷窗：同心圓，無描邊 -->
    <g>
      <circle cx="182" cy="222" r="27" fill="${INK}"/>
      <circle cx="182" cy="222" r="16" fill="${CREAM}"/>
      <circle cx="182" cy="222" r="8" fill="${ORANGE}"/>
      <circle cx="278" cy="240" r="24" fill="${INK}"/>
      <circle cx="278" cy="240" r="13" fill="${CREAM}"/>
      <circle cx="278" cy="240" r="6" fill="${ORANGE}"/>
    </g>

    <!-- 艙房：四邊全直角 + 一條暗橘底邊假造厚度 -->
    <rect x="240" y="90" width="164" height="90" fill="${CREAM}"/>
    <rect x="240" y="172" width="164" height="9" fill="${DEEP}"/>
    <g fill="${INK}">
      <rect x="260" y="110" width="26" height="42"/>
      <rect x="296" y="110" width="26" height="42"/>
      <rect x="332" y="110" width="26" height="42"/>
      <rect x="366" y="110" width="20" height="42"/>
    </g>

    <!-- 桅杆 + 帆 -->
    <rect x="334" y="0" width="9" height="92" fill="${INK}"/>
    <rect x="328" y="22" width="76" height="6" fill="${INK}"/>
    <path d="M338,4 L338,88 L222,88 Z" fill="${ORANGE}"/>
    <path d="M222,88 L338,88 L338,76 L236,76 Z" fill="${DEEP}"/>
    <text x="292" y="52" fill="${CREAM}" font-size="26" font-weight="900" font-style="italic"
          text-anchor="middle" font-family="Arial Black,Arial">SOON</text>
    <text x="292" y="80" fill="${CREAM}" font-size="30" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">鉄</text>

    <!-- 舵輪：正交 4 輻（純幾何） -->
    <g transform="translate(444,126)">
      <circle r="33" fill="${CREAM}"/>
      <circle r="33" fill="none" stroke="${INK}" stroke-width="6"/>
      <g stroke="${INK}" stroke-width="5">
        <line x1="-27" y1="0" x2="27" y2="0"/>
        <line x1="0" y1="-27" x2="0" y2="27"/>
        <line x1="-19" y1="-19" x2="19" y2="19"/>
        <line x1="19" y1="-19" x2="-19" y2="19"/>
      </g>
      <circle r="10" fill="${INK}"/>
    </g>

    <!-- 直幅 -->
    <rect x="470" y="6" width="82" height="158" fill="${ORANGE}"/>
    <rect x="470" y="148" width="82" height="16" fill="${DEEP}"/>
    <rect x="487" y="-10" width="8" height="20" fill="${INK}"/>
    <rect x="478" y="22" width="66" height="5" fill="${CREAM}"/>
    <text x="510" y="72" fill="${CREAM}" font-size="50" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">鉄</text>
    <text x="510" y="134" fill="${CREAM}" font-size="50" font-weight="900" text-anchor="middle"
          font-family="PingFang TC,Noto Sans TC,sans-serif">流</text>

    <!-- 尾舵 + 螺旋槳 -->
    <path d="M524,172 L566,178 L560,220 L518,214 Z" fill="${INK}"/>
    <rect x="492" y="200" width="9" height="34" fill="${INK}"/>
    <ellipse cx="496" cy="242" rx="18" ry="10" fill="${INK}"/>
  </g>
</g>`;
}

/* ============================================================
   錨 — A 版：墨線 + 手繪
   形狀重點（原圖）：粗錨柄、頂端環、橫桿、
   兩隻爪向上鉤、爪尖是「球頭」而不是尖角。
   ============================================================ */
/* 錨：形狀範圍約 x∈[-80,80]、y∈[-120,110]
   → viewBox 必須從 (0,0) 起、寬 200 高 260，並把錨 translate 到中心 (100,130)。
   （教訓：負座標的圖形一定要手動配置 viewBox，否則整個圖偏出畫布）*/
function anchorInk() {
  const w = wobbler(9911);
  return `<g transform="translate(100,132)">
  <!-- 頂環 -->
  <circle cx="0" cy="-96" r="18" fill="none" stroke="${INK}" stroke-width="14"/>
  <!-- 錨柄 -->
  <path d="M0,-78 L0,36" stroke="${INK}" stroke-width="19" stroke-linecap="round"/>
  <!-- 橫桿 -->
  <path d="${w.line(-54,-48,54,-48,1.6)}" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
  <!-- 兩爪：從中央往下再往外上鉤 -->
  <path d="M-4,30 C-14,74 -46,100 -70,76 C-82,64 -80,44 -70,36"
        fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M4,30 C14,74 46,100 70,76 C82,64 80,44 70,36"
        fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  <!-- 球頭（原站關鍵細節：爪尖是球不是尖角） -->
  <circle cx="-68" cy="34" r="12" fill="${INK}"/>
  <circle cx="68" cy="34" r="12" fill="${INK}"/>
  <!-- 中央配重 -->
  <path d="${w.line(-24,4,24,4,1.4)}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
</g>`;
}

/* ============================================================
   錨 — B 版：幾何扁平
   用「單一封閉路徑 + 一個洞」畫出整支錨 → 更乾淨、可縮放不失真
   ============================================================ */
function anchorFlat() {
  return `<g transform="translate(100,132)">
  <!-- 硬陰影：錯開 6px 純黑（無模糊 = B 版特徵） -->
  <g transform="translate(6,7)" opacity=".3">
    <g fill="${INK}">
      <rect x="-11" y="-80" width="22" height="118" rx="8"/>
      <rect x="-56" y="-58" width="112" height="17" rx="8"/>
      <path d="M-72,30 C-78,72 -44,104 0,104 C44,104 78,72 72,30 L52,20 C56,54 32,74 0,74 C-32,74 -56,54 -52,20 Z"/>
    </g>
  </g>
  <!-- 頂環：外圈 + 內圈用橘色挖空（比 evenodd 更保險） -->
  <circle cx="0" cy="-98" r="21" fill="${INK}"/>
  <circle cx="0" cy="-98" r="10" fill="${ORANGE}"/>
  <!-- 柄 -->
  <rect x="-11" y="-80" width="22" height="118" rx="8" fill="${INK}"/>
  <!-- 橫桿 -->
  <rect x="-56" y="-58" width="112" height="17" rx="8" fill="${INK}"/>
  <!-- 爪：外弧下沉 + 內弧上收，形成「香蕉」形（不是半圓） -->
  <path d="M-72,30
           C-78,72 -44,104 0,104
           C44,104 78,72 72,30
           L52,20
           C56,54 32,74 0,74
           C-32,74 -56,54 -52,20 Z"
        fill="${INK}"/>
  <!-- 配重 -->
  <rect x="-21" y="2" width="42" height="16" rx="8" fill="${INK}"/>
</g>`;
}

/* ---------- 匯出：字串 → 可直接給 <img> 用的 SVG ---------- */
function wrap(vbW, vbH, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}">${body}</svg>`;
}

export const ART = {
  // viewBox 要包住「傾斜 + 位移」後的完整範圍，否則頂端旗桿/桅杆會被裁掉
  boat: { a: () => wrap(600, 340, boatInk()),  b: () => wrap(600, 340, boatFlat()) },
  anchor:{ a: () => wrap(200, 260, anchorInk()),  b: () => wrap(200, 260, anchorFlat()) },
};

export function svgToURL(svg) {
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

/** 把 SVG 載成 Image，畫到 canvas 的指定矩形（維持比例、置中） */
export function drawSVGImage(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, tr = w / h;
  let dw = w, dh = h;
  if (ir > tr) dh = w / ir; else dw = h * ir;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}