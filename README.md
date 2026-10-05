# 復刻教學：台北大洋流（current.puma.taipei）視覺系統

> 這是**教學示範**，非官方網站。所有程式碼為重新實作，僅供學習設計系統。

## 檔案

| 檔案 | 角色 |
|---|---|
| `style.css` | 設計 token + 頁面外殼（跑馬燈、流動背景、卡片、按鈕） |
| `assets.js` | **用數學生成 SVG**（跑馬燈條、波浪背景、浪形符號） |
| `card.js` | Canvas 畫 1080×1920 的 9:16 分享海報 |
| `index.html` | 表單 → 生成 → 預覽 → 下載/分享 |
| `_dev-server.js` | 本機靜態伺服器（`node _dev-server.js` → :8899） |

---

## 一、先拆「設計系統」，不要先拆畫面

原站視覺複雜，但**全部由 6 個零件組合**：

```
橘底 + 流動波浪        ← 環境層（全螢幕，z-index:-1）
黑條跑馬燈 ×2         ← 框架層（上下）
粗框 + 硬陰影卡片      ← 內容層
橘 / 米 / 黑 三色      ← 色彩層
900 字重 + 0.08em 字距 ← 文字層
Canvas 生成的 9:16 圖  ← 輸出層
```

**色彩只有 5 個**（從原站 `site.css` 的 `:root` 讀出來）：

```css
--orange: #ea611d;  --cream: #f4efe6;  --ink: #15171c;
--sea:    #03615a;  --sand:  #ffe08a;
```

先寫 token 再寫任何版面，之後調色只需要改 5 行。

---

## 二、最值得學的四個技巧

### 技巧 1：硬陰影（Hard Shadow），不是模糊陰影

原站的卡片/按鈕陰影是 **實心、無模糊** 的：

```css
--shadow-hard: 6px 6px 0 var(--ink);   /* 卡片 */
box-shadow: 0 6px 18px rgba(0,0,0,.25); /* 只有浮動按鈕用模糊 */
```

按壓時位移等於陰影距離，形成「按下去」的物理感：

```css
.btn:active { transform: translate(2px, 2px); }
.back:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--ink); }
```

這是整站「印刷 / 貼紙」質感的來源，比任何濾鏡都有效。

### 技巧 2：SVG 波浪背景 = 「模糊的方波」

原站的旗幟感背景不是畫出來的線，是 **用 `feGaussianBlur` 把方波邊界糊成正弦**：

```svg
<filter id="b">
  <feGaussianBlur stdDeviation="34"/>   <!-- 模糊強度決定「布」的柔軟度 -->
</filter>
```

疊 **兩層不同尺寸 + 不同速度** 就有 2.5D 視差：

| 層 | tile 尺寸 | 模糊 | 速度 |
|---|---|---|---|
| 遠 | 520 × 1400 | 34 | 16s |
| 近 | 780 × 2000 | 50 | 27s |

關鍵在於 **位移必須等於 tile 尺寸**，否則循環時會跳：

```css
@keyframes flow-a {
  from { transform: translate(0, 0); }
  to   { transform: translate(-520px, -1400px); }  /* ← 就是 tile 寬高 */
}
```

### 技巧 3：跑馬燈的無縫循環

同理，動畫位移 = 貼圖寬度：

```css
.bar {
  height: 34px;
  background: #000 var(--strip) repeat-x left center / auto 100%;
  animation: marquee 17s linear infinite;
}
@keyframes marquee {
  from { background-position-x: 0; }
  to   { background-position-x: 594.2px; }   /* ← 必須等於 --strip 的寬 */
}
```

本專案 `assets.js` 用**程式排版**產生這個 tile，寬度算出來是 594.2px（非整數），再同步寫回 CSS 變數 `--strip-w`。若手動估一個整數，兩邊對不上就會看到接縫跳動。

### 技巧 4：桌機不拉寬，而是「框成手機」

原站在 600px 以上不做響應式重排，而是把手機殼畫出來：

```css
@media (min-width: 600px) {
  html { background: #15171c; }
  body {
    width: 430px; max-width: 430px; margin: 0 auto;
    box-shadow: 0 0 0 3px #000, 0 30px 80px rgba(0,0,0,.5);
  }
  .flag-bg { width: 430px; }   /* 背景也跟著收窄 */
}
```

省掉一整套平板/桌機版型，而且更貼近「手機活動網站」的定位。

---

## 三、為什麼分享圖一定要用 Canvas

原站的海報是 `/shared/crew-card.js` → `renderStory()` 用 Canvas 畫的。原因：

1. 輸出必須是 **JPEG/PNG 檔**，不是 DOM（DOM 無法直接匯出）
2. 原生就能 `canvas.toBlob()` → `URL.createObjectURL()` → 直接餵給 `navigator.share({files})`
3. 可以離本機渲染，之後要搬到 Serverless（Cloudflare Worker / Lambda）幾乎不用改

```js
const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
const file = new File([blob], '船員證.jpg', { type: 'image/jpeg' });
await navigator.share({ files: [file], text: '…' });
```

DPR 處理（手機 retina 不會糊，但不要無腦 3x）：

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = 1080 * dpr; canvas.height = 1920 * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // 一次到位，之後都用設計稿座標寫
```

### 繪圖層級（由後到前）

```
1 橘底 + 白色模糊帶 + 深棕模糊帶      環境
2 乾刷紋理（固定種子亂數）            質感
3 上下黑條 + 白字跑馬燈              框架
4 主標「台北 大洋流」+ 雙圓 + 墨點     標題
5 麻繩 / 艙蓋 / 向量錨               裝飾
6 圓窗（6 層同心圓 + 8 顆鉚釘 + 玻璃反光）
7 米色船員證卡（姓名 / 艦隊）
8 側排文字 + 邊碼
9 101 剪影 + 帆船                    場景
10 浪（最後畫 → 蓋住船底 = 船在水裡）
```

**第 10 步的順序是刻意的**：浪畫在船之後，畫面才讀得出「船在水上」。

---

## 四、實測踩到的坑（都是無聲失敗）

| 坑 | 症狀 | 解法 |
|---|---|---|
| `img.decode()` 在圖片**已完成載入**時可能永不 resolve | 按鈕卡在「領取中…」，畫面不變 | 先判 `img.complete`，未完成才 `await decode()` |
| Canvas 畫 emoji（`⚓`） | 顯示豆腐框 ⬜ | 改用 `moveTo/quadraticCurveTo` 畫向量錨，跨平台一致 |
| `rotate(+90°)` 後排多行 | 直排文字疊回主體上 | 偏移要用**負值**（`-(86 + i*42)`） |
| 單條 path 連接遞減矩形 | 101 變成鋸齒亂三角形 | 逐段 `fillRect`，不要自交錯 path |
| 卡片高度 < 欄位總高 | 框線穿出卡片外 | `178 + 172*2 + 18 = 546` → 卡片 `h` 要 ≥ 560 |
| 文字位置寫死數字 | 換字型/字重就錯位 | 用 `ctx.measureText().width` 計算 |
| 截圖需可見視窗 | `browser.screenshot` 報錯 | 改用「點下載 → `browser.files.get()` 取出 JPG」驗證 |

---

## 五、跑起來

```powershell
node _dev-server.js        # http://127.0.0.1:8899
```

> **注意**：此機器的 `HTTP_PROXY` 會攔截 `localhost`。測試時用
> `curl.exe --noproxy '*' http://127.0.0.1:8899/`，瀏覽器不受影響。

## 六、帆船 / 錨：兩種向量畫法（`art.js`）

`compare.html` 是並排比較頁。兩版**造型相同、建構方式不同**：

| | **A 版 — 木刻墨線** | **B 版 — 幾何扁平** |
|---|---|---|
| 主導 | `stroke`（粗黑線） | `fill`（無描邊） |
| 線條 | 手繪抖動 | 完全筆直 |
| 立體 | 墨線壓邊 | 錯色塊（暗橘 + 受光橘） |
| 質感 | 乾刷紋（夾在船體內） | 無紋理 |
| 船板縫 | 抖動曲線 | 細長矩形（工業製圖感） |
| 舵輪 | 8 輻 | 正交 4 輻 |
| 錨 | 描邊 + 球頭 | 單一封閉形 + 硬陰影 |

**A 版更貼近原站**，因為原圖明顯是「粗黑線 + 印刷不滿版」的木刻感。

### 關鍵：手繪抖動

```js
// 把直線切 5 段，每段加 1~2px 偏移，再用 Q 曲線連接
// 振幅只要 1~2px 就會讀成「人手畫的」，再大就變鋸齒
const n = 4;
for (let i = 0; i <= n; i++) {
  pts.push([x1 + (x2-x1)*t + j(a), y1 + (y2-y1)*t + j(a)]);
}
```

### 關鍵：裝飾必須 clip 在主體內

```svg
<clipPath id="hullClip"><path d="M44,168 L150,150 …"/></clipPath>
<g clip-path="url(#hullClip)">
  船板縫 / 乾刷紋 / 背光面
</g>
```

沒有 clip 的話，紋理会噴到船外變成「亂髮」（第一版就這樣，實測）。

### 關鍵：負座標的圖形要手動配 viewBox

錨畫在 `x∈[-80,80]、y∈[-120,110]`，所以 viewBox 必須從 `(0,0)` 起，
並在圖形外包一層 `translate(100,132)`。忘了就會整個偏出畫布（實測，錨只露出一角）。

---

## 七、底圖模式（用 `1.png`）

頁面上可切「純向量 / 用 1.png」。底圖模式會：

1. 用 `drawCover`（裁切填滿，非拉伸）鋪滿 9:16
2. 用橘色塊蓋掉底圖自帶的舊船，補白色浪線
3. 用艙蓋橘底覆蓋舊錨，再畫新錨
4. 重畫卡片（蓋掉舊文字）
5. **最後**畫船 → 讓帆與旗幟疊在卡片上（與原圖的前後關係一致）

### 座標雙系統

底圖是 768×1365，輸出是 1080×1920，所以要兩套單位：

```js
const U = baseAt ? (v => v * W / 768) : px;   // 版面單位
```

**陷阱**：`h` 已經換算成輸出座標，扣除的間距也必須是輸出座標。
混用底圖單位會算出負數或極小值（實測：欄位高度算出 50px，文字疊在一起）。

### 欄位高度要「反推」，不能寫死

```js
const gap = U(16);
const fh = (h - U(108) - U(24) - gap) / fields.length;  // 由卡片高度反推
```

寫死數字 → 一換座標系就溢出框外。

---

## 八、這一輪踩到的坑

| 坑 | 症狀 | 解法 |
|---|---|---|
| `_dev-server.js` 漏了 `.png` 的 MIME | 底圖完全沒出現，且 console 無錯誤 | 補齊 TYPES；**任何靜態伺服器都要列齊副檔名** |
| 各零件用獨立絕對座標 | 帆、艙房、船板縫互相對不齊 | 共用一個座標系 + 整組 `translate/rotate` |
| 紋理沒夾在船體內 | 乾刷紋噴到船外像亂髮 | `<clipPath>` |
| 負座標圖形 + viewBox 從 0 起 | 錨整個偏出畫布 | viewBox 外包 `translate` |
| `h` 用輸出座標、扣除用底圖單位 | 欄位算出 50px、文字疊字 | 統一用同一個單位 |
| 錨的爪畫成半圓 | 鈍鈍的不像錨 | 外弧下沉 + 內弧上收的「香蕉」形 |
| 測 A/B 用 toast 文字當完成訊號 | 四張圖抓到同一張舊圖 | 改比對 `cardImg.src` 或 `dataURL.length` |

---

## 九、要更接近原站的下一步

目前刻意沒做的部分（因為需要素材/後端）：

1. **真實照片** — 圓窗現在是漸層占位。接上使用者大頭貼（原站做法：裁成正方形、縮到 640px、再輸出 96px + 480px 兩份）
2. **登入流程** — 原站走 LINE OAuth + 後端發卡
3. **字型** — 原站用 PingFang TC / Noto Sans TC 900。字重不足時用 `-webkit-text-stroke` 補
4. **中文直排** — `writing-mode: vertical-rl`（Canvas 裡沒有，只能手動 rotate）
5. **其他頁面** — `/ar/` 洋流望遠鏡、`/bottle/` 寫瓶中信、`/map/` 洋流雷達、`/route/` 未來航線，共用同一套 token