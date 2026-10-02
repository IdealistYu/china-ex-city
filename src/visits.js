// 访问次数：Vercount（events.vercount.one，免费第三方计数，请求不经过 Vercel，不增加 Edge Requests）。
// LTS 1.3.7 起由不蒜子（busuanzi.ibruce.info）改为 Vercount：不蒜子长时间 502 / 超时，数字一直加载不出来。
// 显示在全国视图统计卡片底部："小站第 N 次接待访问，欢迎各位旅行者~"，数字以里程表式滚动停到最终值。
//
// 显示全站访问次数（site_pv）而不是访客数（site_uv）：访问次数本来就是"每打开一次加一"，
// 每次打开都 POST 计数一次，返回值既准确，数字也随访问实时上涨。不报新访客（isNewUv: false），不写 cookie。
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

export const initVisits = async () => {
  try { localStorage.removeItem('china-ex-city:visits'); } catch { /* LTS 1.3.0～1.3.1 的访客数缓存，已不再使用 */ }
  if (!line.isConnected) return;
  try {
    const r = await fetch('https://events.vercount.one/api/v2/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://${HOST}/`, isNewUv: false }), // Vercount 按网址的域名区分站点
      signal: AbortSignal.timeout(8000),
    });
    const n = Number((await r.json())?.data?.site_pv);
    if (r.ok && n) show(n);
  } catch { /* 失败或超时：保持占位符 */ }
};
