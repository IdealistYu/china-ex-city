// 成就徽章：每个成就一枚圆形奖章（SVG），替代卡面上的文字。
// 结构：稀有度金属外圈（滚边纹）→ 类别配色的内圈底盘（放射光、同心细纹）→ 白色贴纸风格的图案（粗描边 + 投影）
//      → 顶部高光 →（数字类成就）底部缎带写数字。
// 渐变统一定义在 BADGE_DEFS 里，页面只插入一次，所有徽章共用
import mapData from './map-data.json';

const INK = '#222';
const RED = '#ff7e7e', BLUE = '#88aeff', GREEN = '#a8ffbe', YELLOW = '#ffd95e', ORANGE = '#ffb57e';

// ---------- 共享渐变 ----------
const linear = (id, stops, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${
  stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const radial = (id, light, base) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${base}"/></radialGradient>`;

const RIMS = {
  bronze: ['#f3c796', '#b87333', '#f7d6b3', '#9a5a25', '#e3a56d'],
  silver: ['#f7f9fb', '#a9b3c1', '#ffffff', '#8d98a8', '#dfe5ec'],
  gold: ['#fff2ad', '#e2a92a', '#fff7d6', '#c98a14', '#ffd95e'],
  legend: ['#ff7e7e', '#ffb57e', '#ffe57e', '#a8ffbe', '#88aeff', '#d7a8ff'],
};
// 底盘配色：类别；等级类按对应等级色
const DISCS = {
  count: ['#a8d4ff', '#5b9ee6'],
  province: ['#ffb4a6', '#e3665a'],
  geo: ['#a2e8cb', '#3fae88'],
  score: ['#dbc0ff', '#9a6ee6'],
  l5: ['#ffa3a3', '#e45d5d'],
  l4: ['#ffcfa6', '#ee914a'],
  l3: ['#fff1a6', '#eec446'],
  l2: ['#c9ffd8', '#63cc8b'],
  l1: ['#b8d0ff', '#5a8bef'],
  egg: ['#ffd6e1', '#ef8aa7'],
  mystery: ['#d9d6cf', '#9d988d'],
};
const RIBBONS = { bronze: '#f6d3b0', silver: '#eef2f6', gold: '#ffe58a', legend: '#fff' };

export const BADGE_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${Object.entries(RIMS).map(([k, c]) => linear(`bdg-rim-${k}`, c)).join('')}
${Object.entries(DISCS).map(([k, [a, b]]) => radial(`bdg-disc-${k}`, a, b)).join('')}
${linear('bdg-rainbow', RIMS.legend, 1, 0)}
<linearGradient id="bdg-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs></svg>`;

// ---------- 图案用的小工具 ----------
const star = (cx, cy, r, fill = YELLOW, inner = 0.45) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};
const pin = (x, y, s = 1, fill = RED) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -14c-6 0-10 4.3-10 9.6C-10 2 0 11 0 11s10-9 10-15.4C10-9.7 6-14 0-14z" fill="${fill}"/><circle cx="0" cy="-4.6" r="3.4" fill="#fff"/></g>`;
const house = (x, y, s, roof = RED) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9 -2v12h18V-2"/><path d="M-12.5 0L0 -11l12.5 11z" fill="${roof}"/><rect x="-2.6" y="2.5" width="5.2" height="7.5" fill="${YELLOW}"/></g>`;
const bird = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M-13 1c4-5 9-5 13 1 4-6 9-6 13-1-5-1-9 1-13 6-4-5-8-7-13-6z"/>`;
// 月桂枝：沿圆弧排 5 片叶子（side = -1 左、1 右），叶子方向顺着圆弧
const laurel = side => Array.from({ length: 5 }, (_, i) => {
  const deg = side < 0 ? 115 + i * 28 : 65 - i * 28;
  const a = deg * Math.PI / 180, x = (50 + 23 * Math.cos(a)).toFixed(1), y = (46 + 23 * Math.sin(a)).toFixed(1);
  return `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="6.2" fill="${GREEN}" transform="rotate(${deg} ${x} ${y})"/>`;
}).join('');
const road = d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="12.5"/><path d="${d}" fill="none" stroke="#fff" stroke-width="8"/><path d="${d}" fill="none" stroke="${YELLOW}" stroke-width="1.8" stroke-dasharray="3 3"/>`;
const pie = n => {
  const colors = [RED, ORANGE, YELLOW, GREEN, BLUE, '#d7a8ff', '#fff'];
  return Array.from({ length: n }, (_, i) => {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n, r = 20;
    const p = a => `${(50 + r * Math.cos(a)).toFixed(1)} ${(44 + r * Math.sin(a)).toFixed(1)}`;
    return `<path d="M50 44L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}z" fill="${colors[i % colors.length]}"/>`;
  }).join('');
};
// 中国外轮廓（地图数据里的全国轮廓，缩放到徽章中央）
const CHINA = (fill, extra = '') => {
  const s = 0.056;
  return `<g transform="translate(${(50 - 500 * s).toFixed(1)} ${(43 - 423.6 * s).toFixed(1)}) scale(${s})"><path d="${mapData.outline}" fill="${fill}" stroke-width="${(2.2 / s).toFixed(0)}"/></g>${extra}`;
};

// ---------- 每个成就的图案（100×100 坐标，有缎带时占上方 20～66，否则整体下移居中） ----------
const PICS = {
  // 足迹
  c1: `<g transform="rotate(-14 40 50)"><ellipse cx="40" cy="53" rx="6.2" ry="9.5"/><circle cx="34.8" cy="40" r="2.3"/><circle cx="39.6" cy="38.3" r="2.3"/><circle cx="44.2" cy="39.4" r="2.1"/></g>
<g transform="rotate(14 60 36)"><ellipse cx="60" cy="38" rx="6.2" ry="9.5"/><circle cx="54.8" cy="25" r="2.3"/><circle cx="59.6" cy="23.3" r="2.3"/><circle cx="64.2" cy="24.4" r="2.1"/></g>`,
  c10: `<path d="M42 31a8 8 0 0 1 16 0" fill="none"/><rect x="33" y="30" width="34" height="36" rx="9"/><path d="M33 43h34" fill="none"/><rect x="41" y="49" width="18" height="11" rx="3" fill="${YELLOW}"/><path d="M50 49v4" fill="none"/>`,
  c30: `<rect x="47.5" y="23" width="5" height="44" rx="1.5"/><path d="M30 27h28l6 5.5-6 5.5H30z" fill="${RED}"/><path d="M70 42H42l-6 5.5 6 5.5h28z" fill="${BLUE}"/>`,
  c50: `<rect x="30" y="27" width="14" height="14" rx="3"/><rect x="56" y="27" width="14" height="14" rx="3"/><rect x="43" y="32" width="14" height="7" rx="2"/><circle cx="37" cy="50" r="11.5"/><circle cx="63" cy="50" r="11.5"/><circle cx="37" cy="50" r="6" fill="${BLUE}"/><circle cx="63" cy="50" r="6" fill="${BLUE}"/><circle cx="34.5" cy="47.5" r="1.6" fill="#fff" stroke="none"/><circle cx="60.5" cy="47.5" r="1.6" fill="#fff" stroke="none"/>`,
  c100: `<g transform="rotate(38 50 44)"><path d="M50 18c3 0 4.6 3 4.6 7.5v11l17 9.5v5.5l-17-4.3v10.3l5.3 4v4.2l-9.9-2.2-9.9 2.2v-4.2l5.3-4V52.2l-17 4.3V51l17-9.5v-11C45.4 21 47 18 50 18z"/></g><path d="M22 60c6 2 12 2 18-1" fill="none" stroke-dasharray="3 3"/>`,
  c200: `${road('M30 66C42 54 34 46 46 38s18-9 24-17')}<path d="M56 30l6-10 6 10z" fill="${GREEN}"/><circle cx="30" cy="30" r="5" fill="${YELLOW}"/>`,
  c300: `<path d="M42 30v-5h16v5" fill="none"/><rect x="26" y="30" width="48" height="35" rx="6"/><circle cx="38" cy="43" r="5.5" fill="${RED}"/><rect x="48" y="37" width="15" height="9" rx="2" fill="${BLUE}" transform="rotate(10 55.5 41.5)"/><circle cx="60" cy="55" r="4.5" fill="${GREEN}"/>${star(41, 56, 5.5)}`,
  c370: CHINA('url(#bdg-rainbow)'),
  // 省份
  p10: `<path d="M26 54v-7l7-11h27l9 11h5v7z"/><path d="M36 38.5h10v8.5H31z M49.5 38.5h9.5l6.5 8.5h-16z" fill="${BLUE}"/><circle cx="37" cy="56" r="6"/><circle cx="63" cy="56" r="6"/><circle cx="37" cy="56" r="2.2" fill="${INK}"/><circle cx="63" cy="56" r="2.2" fill="${INK}"/>`,
  p20: `<circle cx="66" cy="28" r="6" fill="${YELLOW}"/><path d="M24 66l17-28 8 11 9-17 18 34z"/><path d="M36.5 45.2l4.5-7.2 4 5.6-3.4 2.8zM53.3 40.8l4.7-8.8 5 9.4-4.8-1.9z" fill="${BLUE}"/>`,
  p34: CHINA('#fff', pin(40, 44, 0.62) + pin(60, 36, 0.62, BLUE) + pin(56, 56, 0.62, YELLOW) + pin(30, 34, 0.62, GREEN)),
  f1: `<path d="M22 66c8-11 18-15 28-15s20 4 28 15z" fill="${GREEN}"/><path d="M47 52V21" fill="none"/><path d="M47 22h20l-5.5 6.5L67 35H47z" fill="${RED}"/>`,
  f5: `<path d="M27 58l-3.5-25 14 11 12.5-17 12.5 17 14-11L73 58z" fill="${YELLOW}"/><rect x="27" y="57" width="46" height="8" rx="2" fill="${YELLOW}"/><circle cx="50" cy="47" r="3.5" fill="${RED}"/><circle cx="37" cy="50" r="2.5" fill="${BLUE}"/><circle cx="63" cy="50" r="2.5" fill="${BLUE}"/>`,
  f10: `${laurel(-1)}${laurel(1)}<path d="M36 55l-2.5-18 10 8 6.5-11 6.5 11 10-8L64 55z" fill="${YELLOW}"/><rect x="36" y="54" width="28" height="6" rx="1.5" fill="${YELLOW}"/><circle cx="50" cy="47" r="2.6" fill="${RED}"/>`,
  // 等级
  l5a: `<path d="M31 43v23h38V43"/><path d="M24 46L50 23l26 23z" fill="${RED}"/><rect x="45" y="50" width="10" height="16" rx="1.5" fill="${YELLOW}"/><rect x="35" y="48" width="7" height="7" fill="${BLUE}"/><rect x="58" y="48" width="7" height="7" fill="${BLUE}"/><path d="M62 33v-7h5v11.5" fill="#fff"/>`,
  l5b: `${house(32, 52, 1)}${house(68, 52, 1, BLUE)}${house(50, 36, 1.15, YELLOW)}`,
  l4: `${bird(40, 44, 1.25)}${bird(62, 30, 0.95)}${bird(64, 54, 0.75)}<path d="M24 62c10-6 20-8 32-6" fill="none" stroke-dasharray="3 3"/>`,
  l3a: `<path d="M38 34l4-6.5h16l4 6.5" /><rect x="25" y="34" width="50" height="31" rx="6"/><circle cx="50" cy="49.5" r="11" fill="${BLUE}"/><circle cx="50" cy="49.5" r="5" fill="#fff"/><rect x="63" y="38" width="7" height="4.5" rx="1" fill="${YELLOW}"/>`,
  l3b: `<path d="M25 30l17-5 16 5 17-5v36l-17 5-16-5-17 5z"/><path d="M42 25v36M58 30v36" fill="none"/><path d="M31 53c7-11 14 3 21-8s10-5 15-11" fill="none" stroke="${RED}" stroke-dasharray="3 2.5"/><path d="M63.5 29.5l5 5m0-5l-5 5" fill="none" stroke="${RED}"/>`,
  l2: `<path d="M42 34v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5" fill="none"/><rect x="25" y="34" width="50" height="31" rx="5"/><path d="M25 47h50" fill="none"/><rect x="45.5" y="43.5" width="9" height="8" rx="1.5" fill="${YELLOW}"/>`,
  l1: `<path d="M22 59V43c0-5 4-8.5 9-8.5h23c10.5 0 19 8 22 19l1 5.5z"/><path d="M58 38.5h3c5.5 0 10 4 12 10.5H58z" fill="${BLUE}"/><rect x="29" y="41" width="9" height="7" rx="1.5" fill="${BLUE}"/><rect x="42" y="41" width="9" height="7" rx="1.5" fill="${BLUE}"/><path d="M22 53h54" fill="none" stroke="${RED}" stroke-width="3"/><path d="M19 65h62M13 44h6M11 50h7" fill="none"/>`,
  // 地理
  'g-muni': `<rect x="25" y="41" width="12" height="25"/><rect x="37" y="27" width="12" height="39"/><rect x="49" y="35" width="12" height="31"/><rect x="61" y="45" width="13" height="21"/><path d="M43 27v-7" fill="none"/>${
    [[29, 46], [29, 54], [41, 33], [41, 41], [41, 49], [53, 41], [53, 49], [65, 50]].map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="4" fill="${BLUE}" stroke-width="1.2"/>`).join('')}`,
  'g-hmt': `<path d="M50 21v35" fill="none"/><path d="M52.5 23l18 29h-18z"/><path d="M47.5 30L33 52h14.5z" fill="${RED}"/><path d="M27 56h46l-6.5 8.5H33.5z" fill="${YELLOW}"/><path d="M22 69c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0 4-1.5 6-1" fill="none" stroke="${BLUE}"/>`,
  'g-cap10': `${pin(50, 45, 1.75)}${star(50, 36.5, 5.5)}`,
  'g-cap': `<path d="M30 56c8-10 14-4 20-14s14-6 20-16" fill="none" stroke-dasharray="3 3"/>${pin(30, 55, 1.05)}${pin(50, 42, 1.05, BLUE)}${pin(70, 29, 1.05, YELLOW)}`,
  'g-ext': `<circle cx="50" cy="45" r="21" fill="none" stroke-dasharray="2 3"/><path d="M50 19l6.5 19.5L76 45l-19.5 6.5L50 71l-6.5-19.5L24 45l19.5-6.5z"/><path d="M50 19l6.5 19.5H43.5zM50 71l-6.5-19.5h13z" fill="${RED}"/><circle cx="50" cy="45" r="3" fill="${INK}"/>`,
  'g-region': `${pie(7)}<circle cx="50" cy="44" r="20" fill="none"/>`,
  'g-nw': `<circle cx="30" cy="28" r="5.5" fill="${YELLOW}"/><path d="M16 66c10-7 20-9 34-6s22 2 34-2v8H16z" fill="${YELLOW}"/>
<path d="M33 53h3.6v12H33zM38.5 53h3.6v12h-3.6zM53 53h3.6v12H53zM58.5 53h3.6v12h-3.6z"/>
<path d="M30 55V48c0-6 4-12 10-13 4-1 6 4 6 7 1-4 3-7 6-7 4 0 6 5 6 9l5-10c1-3 3-5 6-5l4 1v3h-4l-5 14c-1 4-2 8-4 8H32c-1.5 0-2-1-2-2z" fill="${ORANGE}"/>
<circle cx="68.6" cy="30.8" r=".9" fill="${INK}" stroke="none"/>`,
  'g-ne': `<g transform="translate(50 44)">${[0, 60, 120].map(a => `<g transform="rotate(${a})"><path d="M0-22V22M-6-16l6 5 6-5M-6 16l6-5 6 5" fill="none" stroke="${INK}" stroke-width="6.5"/><path d="M0-22V22M-6-16l6 5 6-5M-6 16l6-5 6 5" fill="none" stroke="#fff" stroke-width="3"/></g>`).join('')}<circle r="4.5"/></g>`,
  'g-jn': `<path d="M16 58Q50 28 84 58v7H68a18 15 0 0 0-36 0H16z"/><path d="M16 51Q50 21 84 51" fill="none"/><path d="M26 44.5v6M38 38.5v6.5M50 36v6.5M62 38.5v6.5M74 44.5v6" fill="none" stroke-width="1.8"/><path d="M22 69c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0 8-3 12 0" fill="none" stroke="${BLUE}"/><path d="M30 22l-2 5M44 17l-2 5M58 18l-2 5M72 24l-2 5" fill="none" stroke="${BLUE}"/>`,
  // 分数
  s100: `${star(50, 43, 21)}`,
  s500: `<path d="M34 31h32l9 11-25 25-25-25z" fill="${BLUE}"/><path d="M25 42h50M41 31l-4 11 13 25 13-25-4-11" fill="none" stroke-width="1.8"/><path d="M37 42l4-11M63 42l-4-11" fill="none" stroke-width="1.8"/>`,
  s1000: `<path d="M35 24h30v12c0 10-6 17-15 17s-15-7-15-17z" fill="${YELLOW}"/><path d="M35 29h-7v4c0 6 4 9 8 9M65 29h7v4c0 6-4 9-8 9" fill="none"/><path d="M46 53h8v6h-8z" fill="${YELLOW}"/><rect x="38" y="59" width="24" height="7" rx="1.5" fill="${YELLOW}"/>${star(50, 36, 5.5, '#fff')}`,
  s1850: `<path d="M50 31c-12-9-27 1-25 16 2 14 14 21 25 23 11-2 23-9 25-23 2-15-13-25-25-16z" fill="#ffb8c6"/><path d="M50 31c-3 11-3 24 0 39" fill="none" stroke="#e46f8e" stroke-width="1.8"/><path d="M50 31c-3-6-1-10 3-13" fill="none"/><path d="M53 22c6-6 15-5 17 0-6 4-12 4-17 0z" fill="${GREEN}"/><path d="M48 25c-6-5-14-3-16 1 7 3 12 3 16-1z" fill="${GREEN}"/><ellipse cx="38" cy="45" rx="4" ry="6" fill="#fff" stroke="none" opacity=".55"/>`,
  // 未解锁的彩蛋：只有问号
  mystery: `<text x="50" y="46" text-anchor="middle" dominant-baseline="central" font-size="42" font-weight="bold" fill="#fff" stroke="${INK}" stroke-width="2.5" paint-order="stroke">?</text>`,
};

// 缎带上的数字（数量类成就）
const RIBBON_TEXT = {
  c1: '1', c10: '10', c30: '30', c50: '50', c100: '100', c200: '200', c300: '300', c370: '370',
  p10: '10', p20: '20', p34: '34', f1: '1', f5: '5', f10: '10',
  l5b: '3', l4: '5', l3a: '30', l3b: '100', l2: '20', l1: '30',
  'g-cap10': '10', 'g-cap': '27', 'g-region': '7',
  s100: '100', s500: '500', s1000: '1000', s1850: '1850',
};
const DISC_OF = { l5a: 'l5', l5b: 'l5', l4: 'l4', l3a: 'l3', l3b: 'l3', l2: 'l2', l1: 'l1', s1850: 'egg' };

// 一枚徽章的 SVG。mystery：未解锁的彩蛋，不透露图案
export const badge = (a, mystery = false) => {
  const pic = mystery ? PICS.mystery : PICS[a.id] ?? '';
  const text = mystery ? null : RIBBON_TEXT[a.id];
  const disc = mystery ? 'mystery' : DISC_OF[a.id] ?? a.cat;
  const art = `<g class="bdg-pic" fill="#fff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${pic}</g>`;
  const body = `<g class="bdg-sh" transform="translate(1.6 2.2)" stroke-width="2.2">${pic}</g>${art}`;
  return `<svg class="badge" viewBox="0 0 100 100" aria-hidden="true">
<circle cx="50" cy="50" r="47" fill="url(#bdg-rim-${a.tier})" stroke="${INK}" stroke-width="2.6"/>
<circle cx="50" cy="50" r="43" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="3" stroke-dasharray="1.1 1.9"/>
<circle cx="50" cy="50" r="38" fill="url(#bdg-disc-${disc})" stroke="${INK}" stroke-width="2.2"/>
<circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1"/>
<circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
<g transform="translate(0 ${text ? 0 : 4})">${body}</g>
<path d="M18 38a33 26 0 0 1 64 0c-12-7-24-9-32-9s-20 2-32 9z" fill="url(#bdg-gloss)"/>
${text ? `<path d="M17 68h66l-5.5 8 5.5 8H17l5.5-8z" fill="${RIBBONS[a.tier]}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
<text x="50" y="76.4" text-anchor="middle" dominant-baseline="central" font-size="${text.length > 3 ? 10 : 11.5}" font-weight="bold" fill="${INK}">${text}</text>` : ''}
</svg>`;
};
