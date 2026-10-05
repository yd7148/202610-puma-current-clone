/* ============================================================
   card.js — 用 Canvas 畫 9:16 的分享海報
   為什麼用 Canvas 而不是 DOM？
   1. 要輸出成 JPEG/PNG 給人分享 → 瀏覽器原生就能 toBlob
   2. 原站就是這麼做的：/shared/crew-card.js → renderStory()
   3. 離線可測：不依賴字型載入時序以外的任何資源
   ============================================================ */

import { ART, svgToURL, drawSVGImage } from './art.js';

const C = {
  orange: '#ea611d',
  cream:  '#f4efe6',
  ink:    '#15171c',
  white:  '#ffffff',
};
const FONT = '"PingFang TC","Noto Sans TC","Source Han Sans TW",system-ui,sans-serif';

const W = 1080, H = 1920;              // 9:16 輸出尺寸

/* ---------- 基礎工具 ----------
   px() 保留是為了讓所有座標「寫設計稿上的數字」就好讀，
   之後若要改輸出尺寸，只要改 px 的倍率即可全圖等比縮放。 */
const SCALE = 1;
const px = v => v * SCALE;
function rr(ctx, x, y, w, h, r) {        // 圓角矩形
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- 1. 背景：橘底 + 白色刷痕 ----------
   原站的橘底不是純色，是一層 feGaussianBlur 的白色帶。
   Canvas 版：用多條低透明度、寬筆刷的橫向弧線假造刷痕。 */
function drawBg(ctx) {
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, W, H);

  // 白色帶（模擬原站 wave tile）
  ctx.save();
  ctx.filter = 'blur(34px)';
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath();
  ctx.moveTo(-50, px(240));
  for (let x = -50; x <= W + 50; x += 40)
    ctx.lineTo(x, px(240) + Math.sin(x / 260) * px(70));
  ctx.lineTo(W + 50, px(430)); ctx.lineTo(-50, px(430)); ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(90,20,0,.14)';
  ctx.beginPath();
  ctx.moveTo(-50, px(1010));
  for (let x = -50; x <= W + 50; x += 40)
    ctx.lineTo(x, px(1010) + Math.sin(x / 220 + 1.6) * px(80));
  ctx.lineTo(W + 50, px(1260)); ctx.lineTo(-50, px(1260)); ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 乾刷紋理：短白線，密度隨機但固定種子 → 每次輸出一致
  let seed = 20261001;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 130; i++) {
    const x = rnd() * W, y = rnd() * H, l = px(14 + rnd() * 60), a = px(rnd() * 24 - 12);
    ctx.lineWidth = px(1.5 + rnd() * 4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- 1b. 底圖疊層（可選） ----------
   使用者提供 1.png 作為底圖。注意三件事：
   1. 用 drawImage 的 9 參數版本做「裁切填滿」，不是直接拉伸（會變形）
   2. 底圖已經含文字 → 上層的畫面元素要疊在它「之上」而不是重複畫
   3. 照片區/船/卡若已在底圖裡，就不要再畫一次（否則雙重邊緣） */
const BASE = new URL('./1.png', import.meta.url).href;
let baseImg = null;

export async function loadBase() {
  baseImg = await new Promise(res => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = BASE;
  });
  return baseImg;
}

/** 裁切填滿（cover）：維持比例，溢出部分裁掉 */
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, tr = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; }
  else         { sh = img.width / tr; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ---------- 2. 上下跑馬燈黑條 ---------- */
function drawStrip(ctx, y, h) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${px(21)}px Arial Black, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  const label = 'FUTURE  SOON   →   THE TAIPEI CURRENT   →   FUTURE  SOON   →   ';
  // 用 measureText 鋪滿整條，寬度自然對齊 → 不會接縫
  let x = px(16);
  while (x < W) { ctx.fillText(label, x, y + h / 2); x += ctx.measureText(label).width; }
}

/* ---------- 3. 頂部主標 ----------
   技巧：先量文字寬度再決定位置，不要用猜的數字。
   否則字一換（不同字重/字型）圈就會錯位。 */
function drawTitle(ctx) {
  const cy = px(190), size = px(140);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.fillStyle = C.ink;

  const t1 = '台北', t2 = '大洋流';
  const w1 = ctx.measureText(t1).width;
  const w2 = ctx.measureText(t2).width;
  const gap = px(60);
  const total = w1 + gap + w2;
  const x1 = W / 2 - total / 2 + w1 / 2;
  const x2 = W / 2 - total / 2 + w1 + gap + w2 / 2;

  // 「台北」兩字各套一個圓（招牌動作）
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = px(10);
  const r = px(96);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x1 + s * w1 * 0.28, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillText(t1, x1, cy);
  ctx.fillText(t2, x2, cy);

  // 墨點裝飾
  for (const [dx, dy, rr2] of [[-430, -80, 24], [430, -90, 20], [-250, 120, 16]]) {
    ctx.beginPath(); ctx.arc(W / 2 + px(dx), cy + px(dy), px(rr2), 0, 7); ctx.fill();
  }
}

/* ---------- 4. 圓窗（porthole）----------
   六層：外黑框 → 橙圈 → 黑框 → 銅色鉚釘 → 照片 → 白色反光 */
function drawPorthole(ctx, d, img, anchorImg) {
  const cx = W / 2, cy = px(700), R = px(275);

  // 麻繩（左右兩條垂下來）
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = px(16);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * R * 1.06, cy - R * 0.62);
    ctx.bezierCurveTo(cx + s * R * 1.35, cy + R * 0.2, cx + s * R * 1.2, cy + R * 0.75, cx + s * R * 0.62, cy + R * 0.95);
    ctx.stroke();
  }

  // 艙蓋（上蓋）
  // 注意：⚓ 是 emoji，Canvas 字型通常沒有 → 會畫成豆腐框。
  // 所以改用「向量路徑」畫錨，跨平台一致。
  ctx.save();
  ctx.translate(cx - R * 0.08, cy - R * 1.05);
  ctx.rotate(-0.30);
  ctx.fillStyle = C.orange;
  ctx.strokeStyle = C.ink; ctx.lineWidth = px(8);
  rr(ctx, -R * 0.92, -R * 0.30, R * 1.84, R * 0.60, R * 0.30);
  ctx.fill(); ctx.stroke();

  // 錨：交給 art.js 的向量插畫（有 A/B 兩版），不再用 Canvas 手畫
  if (anchorImg) {
    const aw = px(190), ah = px(247);
    drawSVGImage(ctx, anchorImg, -aw / 2, -ah / 2, aw, ah);
  } else {
    const s = px(78);
    ctx.strokeStyle = C.ink; ctx.lineWidth = px(12);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.15);
    ctx.lineTo(0, s * 0.35);
    ctx.moveTo(-s * 0.42, -s * 0.82);
    ctx.lineTo(s * 0.42, -s * 0.82);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 1.32, s * 0.2, 0, 7); ctx.stroke();
  }
  ctx.restore();

  // 本體
  const rings = [
    [R * 1.16, C.cream], [R * 1.10, C.ink], [R * 1.02, C.orange],
    [R * 0.96, C.ink],  [R * 0.90, C.cream],
  ];
  for (const [r, col] of rings) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
    ctx.fillStyle = col; ctx.fill();
  }

  // 照片（圓形裁切）
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.88, 0, 7); ctx.clip();
  if (img) { ctx.drawImage(img, cx - R * .88, cy - R * .88, R * 1.76, R * 1.76); }
  else {
    const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    g.addColorStop(0, '#7fb2d8'); g.addColorStop(.55, '#cfe3ee'); g.addColorStop(1, '#4a5b46');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  ctx.restore();

  // 鉚釘 8 顆
  ctx.fillStyle = C.ink;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + .4;
    const rx = cx + Math.cos(a) * R * 1.03, ry = cy + Math.sin(a) * R * 1.03;
    ctx.beginPath(); ctx.arc(rx, ry, px(20), 0, 7); ctx.fill();
    ctx.fillStyle = C.orange;
    ctx.beginPath(); ctx.arc(rx, ry, px(9), 0, 7); ctx.fill();
    ctx.fillStyle = C.ink;
  }
  // 玻璃反光
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R * .88, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath();
  ctx.moveTo(cx - R, cy - R); ctx.lineTo(cx + R * .2, cy - R);
  ctx.lineTo(cx - R * .3, cy + R); ctx.lineTo(cx - R, cy + R); ctx.fill();
  ctx.restore();
}

/* ---------- 5. 白色船員證卡 ----------
   baseAt: 若有底圖，座標以底圖 768×1365 為基準（底圖已含卡片位置），
   否則用純向量的 1080×1920 版面座標。 */
function drawMemberCard(ctx, d, baseAt = false) {
  // U = 版面單位。底圖模式用底圖座標（×1.406），純向量用 1080 座標（×1）
  const U = baseAt ? (v => v * W / 768) : px;
  const x = baseAt ? U(95)  : px(110);
  const y = baseAt ? U(740) : px(1055);
  const w = baseAt ? U(730) - U(95) : W - px(220);
  const h = baseAt ? U(1155) - U(740) : px(560);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = U(10); ctx.shadowOffsetY = U(8);
  ctx.fillStyle = C.cream;
  rr(ctx, x, y, w, h, U(26)); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = U(8);
  rr(ctx, x, y, w, h, U(26)); ctx.stroke();

  // 標題列
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  // textBaseline 統一設 alphabetic，並讓主標與副標的行距由字級推導，
// 避免改字級時兩行重疊（實測踩過：副標被主標壓住）。
ctx.font = `900 ${U(62)}px ${FONT}`;
  ctx.fillText('登船成員', x + w / 2, y + U(78));
  ctx.font = `700 ${U(20)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(21,23,28,.55)';
  ctx.fillText('CREW MEMBER', x + w / 2, y + U(122));

  // 兩欄位
  const fields = [
    ['姓名 / 暱稱', 'NAME / NICKNAME', d.name || '船員', '船員'],
    ['艦隊', 'FLEET', d.fleet || '台灣大洋流艦隊', ''],
  ];
  // 關鍵：欄位高度由「卡片可用高度」反推，不要寫死數字。
  // 陷阱：h 已經是「輸出座標」，所以扣除量也必須是輸出座標，
  //      混用底圖單位會算出負數/極小值（實測踩過）。
  // 另一個陷阱：headH 是標題區高度（主標 + 副標），
  //      改字級時必須同步放大，否則副標會被主標壓住（實測踩過）。
  const gap = U(16);
  const headH = U(148);
  const fh = (h - headH - U(24) - gap) / fields.length;
  let fy = y + headH;
  for (const [zh, en, val, right] of fields) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = U(5);
    rr(ctx, x + U(28), fy, w - U(56), fh, U(14)); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = `900 ${fh * 0.17}px ${FONT}`;
    ctx.fillText(zh, x + U(44), fy + fh * 0.26);
    ctx.fillStyle = 'rgba(21,23,28,.5)';
    ctx.font = `700 ${fh * 0.115}px Arial, sans-serif`;
    ctx.fillText(en, x + U(44) + ctx.measureText(zh).width + U(50), fy + fh * 0.26);

    ctx.fillStyle = C.ink;
    ctx.font = `900 ${fh * 0.40}px ${FONT}`;
    ctx.fillText(val, x + U(52), fy + fh * 0.82);
    if (right) {
      ctx.font = `900 ${fh * 0.25}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(right, x + w - U(52), fy + fh * 0.82);
    }
    ctx.textAlign = 'center';
    fy += fh + gap;
  }
}

/* ---------- 6. 側邊直排文字 + 邊碼 ---------- */
function drawSide(ctx, d) {
  // 右側：NO. + 口號（都在主體右邊的空白帶）
  ctx.save();
  ctx.translate(W - px(44), px(1180));
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.font = `900 ${px(36)}px ${FONT}`;
  ctx.fillText('NO.' + (d.serial || '092677'), 0, 0);

  // 陷阱：rotate(+90°) 後，垂直方向的偏移會變成「向左」移動。
  // 所以要排多行必須用「負值」，否則會疊回卡片上。
  ctx.font = `900 ${px(28)}px ${FONT}`;
  const lines = ['PEOPLE', 'POLICY', 'PROGRESS', 'A BETTER', 'TAIPEI'];
  lines.forEach((t, i) => ctx.fillText(t, 0, -(px(86) + i * px(42))));
  ctx.restore();

  // 左側：日期（放在 101 剪影上方的空白）
  ctx.save();
  ctx.translate(px(48), px(1560));
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.font = `900 ${px(34)}px ${FONT}`;
  ctx.fillText('2026.10.01', 0, 0);
  ctx.restore();
}

/* ---------- 7. 帆船（SVG 插畫） ----------
   baseAt=true 時用底圖座標，讓船疊在底圖舊船的位置上。 */
function drawBoatSVG(ctx, img, baseAt = false) {
  const U = baseAt ? (v => v * W / 768) : px;
  // 底圖模式：船要坐在卡片「下方偏右」，帆/旗幟才會露出在卡片右緣外
  const w = U(baseAt ? 400 : 700);
  const h = w / (600 / 340);          // 保持 viewBox 比例 600:340
  drawSVGImage(ctx, img, U(baseAt ? 358 : 340), baseAt ? U(1075) : H - px(300), w, h);
}

/* ---------- 8. 左下剪影（台北 101）+ 浪 ---------- */
function drawSkyline(ctx) {
  const baseY = px(1846);

  // 台北 101：逐段畫矩形。i=0 是最底層，必須最寬（下寬上窄）。
  // 教訓：不要用一條 path 把遞減矩形串起來 → 會自交錯成鋸齒亂三角形。
  ctx.save();
  ctx.fillStyle = C.ink;
  const cxT = px(120), botY = baseY - px(6);
  const segs = 9, segH = px(16), topW = px(92), botW = px(200);
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const w = botW + (topW - botW) * t;
    ctx.fillRect(cxT - w / 2, botY - segH * (i + 1), w, segH);
  }
  ctx.beginPath();
  ctx.moveTo(cxT - px(12), botY - segH * segs);
  ctx.lineTo(cxT, botY - segH * segs - px(110));
  ctx.lineTo(cxT + px(12), botY - segH * segs);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* 浪：最後畫 → 蓋住船底 = 船在水裡 */
function drawWaves(ctx) {
  const baseY = px(1846);
  ctx.strokeStyle = C.cream; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.lineWidth = px(16 - i * 3);
    ctx.beginPath();
    const yy = baseY - px(10) + i * px(26);
    ctx.moveTo(px(150), yy);
    ctx.bezierCurveTo(px(400), yy - px(36), px(650), yy + px(36), px(900), yy);
    ctx.stroke();
  }
}

/* ---------- 主流程 ----------
   opts.art   = 'a' | 'b'    插畫版本
   opts.base  = true        是否以 1.png 為底圖
   底圖已包含標題 / 照片窗 / 卡片 / 帆船，
   所以底圖模式下只重繪「會變動的部分」：卡片文字、船、錨。 */
export async function renderCard(canvas, data = {}, opts = {}) {
  const { art = 'a', base = false } = opts;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 頭像
  let img = null;
  if (data.photo) {
    img = await new Promise(res => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => res(null);
      i.src = data.photo;
    });
  }
  // 插畫（SVG → Image）
  const [boatImg, anchorImg] = await Promise.all([
    new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = svgToURL(ART.boat[art]()); }),
    new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = svgToURL(ART.anchor[art]()); }),
  ]);

  if (base && baseImg) {
    // ---- 底圖模式 ----
  // 座標換算：底圖 768×1365 → 輸出 1080×1920
  const B = { x: v => v * W / 768, y: v => v * H / 1365 };
  drawCover(ctx, baseImg, 0, 0, W, H);

  // 底圖自帶舊船 → 用橘色大範圍蓋掉，再補白色浪線，最後畫新船
  if (boatImg) {
    ctx.save();
    ctx.beginPath();
    // 用「底圖本身的橘色」覆蓋。邊界要跟底圖浪線對齊，
    // 否則會出現一條橘/米色交界硬邊（實測踩過）。
    ctx.moveTo(B.x(300), B.y(1130));
    ctx.lineTo(W, B.y(1130));
    ctx.lineTo(W, H - px(80));
    ctx.lineTo(B.x(300), H - px(80));
    ctx.closePath();
    ctx.fillStyle = C.orange;
    ctx.fill();
    ctx.strokeStyle = C.cream; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = px(15 - i * 3);
      ctx.beginPath();
      const yy = B.y(1255) + i * px(26);
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(W * .35, yy - px(34), W * .7, yy + px(34), W, yy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 錨：先用艙蓋橘底覆蓋舊錨，再畫新錨
  if (anchorImg) {
    const ax = B.x(330), ay = B.y(325);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-0.30);
    ctx.fillStyle = C.orange;
    rr(ctx, -px(165), -px(52), px(330), px(104), px(52));
    ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = px(8);
    rr(ctx, -px(165), -px(52), px(330), px(104), px(52));
    ctx.stroke();
    ctx.restore();
    drawSVGImage(ctx, anchorImg, ax - px(105), ay - px(136), px(210), px(272));
  }

  drawMemberCard(ctx, data, true);
  // 船最後畫 → 帆與旗幟會疊在卡片上（原圖就是這個前後關係）
  if (boatImg) drawBoatSVG(ctx, boatImg, true);
  return canvas;
  }

  // ---- 純向量模式 ----
  drawBg(ctx);
  drawStrip(ctx, 0, px(72));
  drawStrip(ctx, H - px(72), px(72));
  drawTitle(ctx);
  drawPorthole(ctx, data, img, anchorImg);
  drawMemberCard(ctx, data);
  drawSide(ctx, data);
  drawSkyline(ctx);
  if (boatImg) drawBoatSVG(ctx, boatImg);
  drawWaves(ctx);
  return canvas;
}