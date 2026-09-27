// 导出 PNG：SVG 文本（内联样式与字体）→ <img> → canvas。全国图在这里生成，单省图见 export-province.js
import { LEVELS, tally } from './levels.js';
import CARD_STYLE from './card.css?raw';
import { buildMap, paint, setDetail, hasFine, units, FULL_VIEW } from './map.js';
import { canDownload, download } from './download.js';
import { esc } from './dom.js';

const SCALE = 2;
const FONT = `'CityEx Sans','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif`;

export const BG = '#f3efe6';
// 外框：图片整体做成一张卡片（深色描边、圆角、硬投影），外面留一圈比卡片深一档的底色，像相框
const FRAME = { outer: '#e2dacb', ink: '#222', shadow: 'rgba(0,0,0,.16)', margin: 22, radius: 22, border: 4, dx: 5, dy: 7 };

const STYLE = `
.sea{fill:${BG}}
.unit{fill:#fff;stroke:#fff;stroke-width:.35;stroke-linejoin:round}
${LEVELS.filter(l => l.value).map(l => `.unit[data-level="${l.value}"]{fill:${l.color};stroke:${l.color}}`).join('')}
.line-province{fill:none;stroke:#222;stroke-width:.55;stroke-linejoin:round}
.line-country{fill:none;stroke:#222;stroke-width:1.1;stroke-linejoin:round}
.inset-bg{fill:#fbf9f4}
.inset-frame{fill:none;stroke:#222;stroke-width:1.1}
.inset-title{font-size:10px;text-anchor:end;fill:#6b665c}
.inset .unit{stroke-width:.2}
.inset .line-province{stroke-width:.35}
.inset .line-country{stroke-width:.55}
.inset .sansha{stroke:#222;stroke-width:.7}
.jd{fill:#222;stroke:#222;stroke-width:1.2;stroke-linecap:round}
text{font-family:${FONT};fill:#222}
`;

// ---------- 文字另行绘制 ----------
// SVG 作为图片渲染时，内联字体是异步加载的，最先排版的文字可能已经用了备用字体（且不会重排）。
// 因此文字不交给 SVG 渲染：先把 SVG 放进页面，读出每段文字的位置、字号、颜色、变换，
// 从 SVG 里删掉文字，图形部分照常转成图片；文字再用 canvas 以页面已加载好的字体画上去。
const extractText = svgText => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none';
  host.innerHTML = svgText;
  document.body.append(host);
  try {
    const svg = host.firstElementChild;
    const ops = [];
    for (const t of svg.querySelectorAll('text')) {
      const cs = getComputedStyle(t);
      if (cs.display === 'none') continue;
      const m = t.getCTM();
      const styleOf = el => {
        const c = getComputedStyle(el);
        return { size: parseFloat(c.fontSize), family: c.fontFamily, weight: c.fontWeight, fill: c.fill };
      };
      const runs = [...t.childNodes].map(n => ({
        text: n.textContent,
        ...(n.nodeType === 1 ? styleOf(n) : styleOf(t)),
      })).filter(r => r.text);
      ops.push({
        m: [m.a, m.b, m.c, m.d, m.e, m.f],
        x: t.x.baseVal[0]?.value ?? 0,
        y: t.y.baseVal[0]?.value ?? 0,
        anchor: cs.textAnchor,
        central: cs.dominantBaseline === 'central' || cs.dominantBaseline === 'middle',
        stroke: cs.stroke !== 'none' ? cs.stroke : null,
        strokeWidth: parseFloat(cs.strokeWidth) || 0,
        runs,
      });
      t.remove();
    }
    return { svg: svg.outerHTML, ops, chars: ops.flatMap(o => o.runs.map(r => r.text)).join('') };
  } finally {
    host.remove();
  }
};

const drawText = (ctx, ops, scale, ox = 0, oy = 0) => {
  const color = c => (c && c !== 'none' ? c : '#222');
  for (const o of ops) {
    const [a, b, c, d, e, f] = o.m;
    ctx.setTransform(a * scale, b * scale, c * scale, d * scale, e * scale + ox, f * scale + oy);
    ctx.textBaseline = o.central ? 'middle' : 'alphabetic';
    ctx.textAlign = 'left';
    const font = r => `${r.weight} ${r.size}px ${r.family}`;
    const widths = o.runs.map(r => { ctx.font = font(r); return ctx.measureText(r.text).width; });
    const total = widths.reduce((s, w) => s + w, 0);
    let x = o.x - (o.anchor === 'middle' ? total / 2 : o.anchor === 'end' ? total : 0);
    const positions = widths.map(w => { const p = x; x += w; return p; });
    if (o.stroke && o.strokeWidth) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeWidth;
      ctx.strokeStyle = o.stroke;
      o.runs.forEach((r, i) => { ctx.font = font(r); ctx.strokeText(r.text, positions[i], o.y); });
    }
    o.runs.forEach((r, i) => { ctx.font = font(r); ctx.fillStyle = color(r.fill); ctx.fillText(r.text, positions[i], o.y); });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// 把 SVG 文本栅格化为 PNG，返回 blob URL；能下载时顺便触发下载。
// padding：卡片内侧留白（SVG 单位）。图片总尺寸保持 W×H，内容按比例缩小放进卡片
export const rasterize = async (text, W, H, scale, filename, { padding = 0 } = {}) => {
  const { svg, ops, chars } = extractText(text);
  await document.fonts.load(`16px 'CityEx Sans'`, chars); // 确保页面字体已就绪
  const img = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  const cw = canvas.width = W * scale;
  const ch = canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  const [m, r, dx, dy, pad] = [FRAME.margin, FRAME.radius, FRAME.dx, FRAME.dy, padding].map(v => v * scale);
  // 卡片：扣掉外圈留白和投影偏移；内容等比缩放后居中
  const bw = cw - m * 2 - dx, bh = ch - m * 2 - dy;
  const k = Math.min((bw - pad * 2) / cw, (bh - pad * 2) / ch);
  const ox = m + (bw - cw * k) / 2, oy = m + (bh - ch * k) / 2;

  ctx.fillStyle = FRAME.outer;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = FRAME.shadow;
  roundRect(ctx, m + dx, m + dy, bw, bh, r);
  ctx.fill();
  ctx.save();
  roundRect(ctx, m, m, bw, bh, r);
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(m, m, bw, bh);
  ctx.drawImage(img, ox, oy, cw * k, ch * k);
  drawText(ctx, ops, scale * k, ox, oy);
  ctx.restore();
  ctx.lineWidth = FRAME.border * scale;
  ctx.strokeStyle = FRAME.ink;
  roundRect(ctx, m, m, bw, bh, r);
  ctx.stroke();
  URL.revokeObjectURL(svgUrl);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  // 内置浏览器不支持下载时，只展示图片供长按保存
  if (canDownload()) download(url, filename);
  return url;
};

export const exportImage = async levels => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  buildMap(svg, { withLabels: false });
  if (hasFine()) setDetail(svg, 'fine'); // 导出图分辨率较高，精细版已加载就用精细版
  for (const [code, level] of Object.entries(levels)) paint(svg, code, level);

  const { counts, score, visited } = tally(levels, units);

  // 标题放在左上角（新疆以北的空白处），图例放在左下角（西藏以南的空白处）
  const [, , W, H] = FULL_VIEW;
  let overlay = `<text x="28" y="62" font-size="44" font-weight="bold">城市制霸</text>
<text x="30" y="98" font-size="20">${visited} / ${units.length} 城 · ${score} 分</text>`;
  LEVELS.filter(l => l.value).forEach((l, i) => {
    const y = H - 30 - (LEVELS.length - 2 - i) * 26;
    overlay += `<rect x="30" y="${y - 15}" width="30" height="18" rx="3" fill="${l.color}" stroke="#222" stroke-width="1"/>
<text x="70" y="${y}" font-size="17">${esc(l.name)}  ${counts[l.value]}</text>`;
  });

  // --k：导出图 1 单位 = SCALE 像素，投影偏移与页面上保持同样的像素
  const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FULL_VIEW.join(' ')}" width="${W}" height="${H}" style="--k:${1 / SCALE}">`
    + `<style>${STYLE}${CARD_STYLE}</style>${svg.innerHTML}${overlay}</svg>`;

  return rasterize(text, W, H, SCALE, '城市制霸.png', { padding: 16 }); // 地图铺得很满，和边框之间留点空
};
