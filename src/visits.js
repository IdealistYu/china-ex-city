// 访客计数：不蒜子（busuanzi.ibruce.info，免费的第三方计数服务）。请求发往不蒜子，不经过 Vercel，不增加 Edge Requests。
// 首页在首屏空闲后记一次；数字显示在说明页（public/about.html 里有同样的请求，读取并显示全站访客数）。
// 只在正式域名上计数，本地开发、测试不会污染数据。不蒜子没有只读接口，每次请求都会计数；访客数（UV）按人去重
const HOST = 'china.loveyou.moe';

export const countVisit = () => {
  if (location.hostname !== HOST) return;
  const cb = `bsz_${Math.random().toString(36).slice(2)}`;
  const s = document.createElement('script');
  window[cb] = () => { delete window[cb]; s.remove(); };
  s.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`;
  s.referrerPolicy = 'no-referrer-when-downgrade'; // 不蒜子按来源网址区分站点
  s.async = true;
  s.onerror = () => { delete window[cb]; s.remove(); }; // 计数服务故障不影响网站
  document.head.append(s);
};
