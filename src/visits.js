// 访问次数：不蒜子（busuanzi.ibruce.info，免费第三方计数，请求不经过 Vercel，不增加 Edge Requests）。
// 显示在全国视图统计卡片底部："小站第 N 次接待访问，欢迎各位旅行者~"，数字以里程表式滚动停到最终值。
//
// 显示全站访问次数（site_pv）而不是访客数（site_uv）：不蒜子没有只读接口，每次取数都会计数；
// 访客数靠第三方 cookie 去重，iPhone / 微信等会拦截而重复计入，只能缓存、数字长期不动。
// 访问次数本来就是"每打开一次加一"，每次打开都请求既准确，数字也随访问实时上涨。
// 这句话随首屏一起显示，数字位置先放占位符"…"，数据到了再滚出数字；请求失败就一直显示占位符。
// （以前整行等数据到了才淡入，成了页面最晚画出的最大文字，把 LCP 拖到 2 秒多）
// 只在正式域名上请求，本地开发、测试不污染数据，这一行在模块加载时就移除，不会闪一下
const HOST = 'china.loveyou.moe';
const BASE = 1528; // 接入不蒜子之前的访问次数（Vercel Analytics 的 Page Views）

const line = document.querySelector('#visits');
const num = line.querySelector('b');
if (location.hostname !== HOST) line.remove();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// 里程表：每一位数字是一列 0～9 竖排，滚动（多转几圈）后停在目标数字上；从个位开始依次停下
const show = n => {
  const text = (n + BASE).toLocaleString('zh-CN');
  const digits = [...text];
  // 读屏软件读隐藏的完整数字，里程表各列只是视觉效果（<b> 不能用 aria-label）
  num.innerHTML = `<span class="vh">${text}</span>` + digits.map((c, i) => /\d/.test(c)
    ? `<span class="odo" aria-hidden="true"><span class="odo-col" style="--d:${c};--i:${digits.length - 1 - i}">${'0123456789'.repeat(3)}</span></span>`
    : `<span aria-hidden="true">${c}</span>`).join('');
  num.classList.remove('wait');
  if (reduceMotion.matches) return num.classList.add('done');
  requestAnimationFrame(() => requestAnimationFrame(() => num.classList.add('done'))); // 先画出起始位置，再开始滚动
};

export const initVisits = () => {
  try { localStorage.removeItem('china-ex-city:visits'); } catch { /* LTS 1.3.0～1.3.1 的访客数缓存，已不再使用 */ }
  if (!line.isConnected) return;
  const cb = `bsz_${Math.random().toString(36).slice(2)}`;
  const s = document.createElement('script');
  const cleanup = () => { delete window[cb]; s.remove(); };
  window[cb] = d => {
    cleanup();
    const n = Number(d?.site_pv);
    if (n) show(n);
  };
  s.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`;
  s.referrerPolicy = 'no-referrer-when-downgrade'; // 不蒜子按来源网址区分站点
  s.async = true;
  s.onerror = cleanup;
  document.head.append(s);
};
