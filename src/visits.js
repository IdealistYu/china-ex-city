// 独立访客数：Vercount（events.vercount.one，免费第三方计数，请求不经过 Vercel，不增加 Edge Requests）。
// 显示在全国视图统计卡片底部："欢迎第 N 位旅行者到访本站~"，数字以里程表式滚动停到最终值。
//
// 每次打开首页都 POST 一次（访问次数 +1），返回全站数据，显示其中的独立访客数 site_uv。
// 去重：本站域名下的 cookie（与 Vercount 官方脚本同名、有效期一年），没有就作为新访客上报并写入。
// 是第一方 cookie，不受 iPhone / 微信拦截第三方 cookie 影响；无痕模式、清除数据、换设备会再计一次。
// 这句话随首屏一起显示，数字位置先放占位符"…"，数据到了再滚出数字；请求失败就一直显示占位符。
// 只在正式域名上请求，本地开发、测试不污染数据，这一行在模块加载时就移除，不会闪一下
const HOST = 'china.loveyou.moe';
const UV_COOKIE = 'vercount_uv_china_loveyou_moe';

const line = document.querySelector('#visits');
const num = line.querySelector('b');
if (location.hostname !== HOST) line.remove();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// 里程表：每一位数字是一列 0～9 竖排，滚动（多转几圈）后停在目标数字上；从个位开始依次停下
const show = n => {
  const text = n.toLocaleString('zh-CN');
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
  if (!line.isConnected) return;
  const isNewUv = !document.cookie.split('; ').includes(`${UV_COOKIE}=1`);
  try {
    const r = await fetch('https://events.vercount.one/api/v2/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://${HOST}/`, isNewUv }), // Vercount 按网址的域名区分站点
    });
    const n = Number((await r.json())?.data?.site_uv);
    if (!r.ok || !n) return;
    // 计数成功后才记下"来过"，失败时下次仍按新访客上报
    if (isNewUv) document.cookie = `${UV_COOKIE}=1; path=/; max-age=31536000; samesite=lax; secure`;
    show(n);
  } catch { /* 请求失败：保持占位符 */ }
};
