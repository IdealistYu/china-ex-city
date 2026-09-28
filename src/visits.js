// 访客总数：不蒜子（busuanzi.ibruce.info，免费第三方计数，请求不经过 Vercel，不增加 Edge Requests）。
// 显示在全国视图统计卡片底部："已有 N 位旅行者来过这里"，数字以里程表式滚动停到最终值。
//
// 去重：不蒜子靠它自己域名的第三方 cookie 认人，iPhone（Safari 内核）、微信等会拦截，每次请求都会被当成新访客。
// 所以在网站自己的 localStorage 里缓存数字：一台设备第一次访问时请求（计数 + 取数），之后 7 天内直接显示缓存、
// 不再请求；过期后才再请求一次刷新。这样被拦截 cookie 的设备最多每 7 天多计一次。
// 只在正式域名上请求，本地开发、测试不污染数据；请求失败时这一行留空，不影响网站
const HOST = 'china.loveyou.moe';
const BASE = 850;                      // 接入不蒜子之前（上线头两天）的访客数
const KEY = 'china-ex-city:visits';    // { n: 不蒜子的访客数, t: 取得时间 }
const REFRESH = 7 * 24 * 3600 * 1000;  // 缓存有效期

const line = document.querySelector('#visits');
const num = line.querySelector('b');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const readCache = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const writeCache = n => { try { localStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() })); } catch { /* 忽略 */ } };

// 里程表：每一位数字是一列 0～9 竖排，滚动（多转几圈）后停在目标数字上；从个位开始依次停下
const show = n => {
  const text = (n + BASE).toLocaleString('zh-CN');
  const digits = [...text];
  num.setAttribute('aria-label', text);
  num.innerHTML = digits.map((c, i) => /\d/.test(c)
    ? `<span class="odo" aria-hidden="true"><span class="odo-col" style="--d:${c};--i:${digits.length - 1 - i}">${'0123456789'.repeat(3)}</span></span>`
    : `<span aria-hidden="true">${c}</span>`).join('');
  line.classList.add('on');
  if (reduceMotion.matches) return num.classList.add('done');
  requestAnimationFrame(() => requestAnimationFrame(() => num.classList.add('done'))); // 先画出起始位置，再开始滚动
};

const request = () => {
  const cb = `bsz_${Math.random().toString(36).slice(2)}`;
  const s = document.createElement('script');
  const cleanup = () => { delete window[cb]; s.remove(); };
  window[cb] = d => {
    cleanup();
    const n = Number(d?.site_uv);
    if (!n) return;
    writeCache(n);
    show(n);
  };
  s.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`;
  s.referrerPolicy = 'no-referrer-when-downgrade'; // 不蒜子按来源网址区分站点
  s.async = true;
  s.onerror = cleanup;
  document.head.append(s);
};

export const initVisits = () => {
  if (location.hostname !== HOST) { line.remove(); return; }
  const cache = readCache();
  if (cache?.n && Date.now() - cache.t < REFRESH) show(cache.n);
  else request();
};
