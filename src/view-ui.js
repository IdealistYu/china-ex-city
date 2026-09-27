// 查看模式（打开别人的分享链接 #/s/…）：面板顶部"XX的城市制霸图"、分享者的成就缩略统计、
// 底部醒目的"创建 / 查看我的城市制霸图"入口。地图、统计、导出都直接用 store 里的分享数据；
// 修改类操作由 main.js / store.js 挡住，成就记录由 achievements-ui.js 跳过。普通模式下本模块什么都不做
import { allLevels, viewing, hasOwnData } from './store.js';
import { evaluate, TIERS } from './achievements.js';
import { $, esc } from './dom.js';

const SHOW_BADGES = 5; // 缩略统计里展示几枚徽章
const TIER_ORDER = ['legend', 'gold', 'silver', 'bronze'];

if (viewing) {
  const who = viewing.name || 'TA';
  document.documentElement.dataset.mode = 'view';
  document.title = `${who}的城市制霸图 - 城市制霸`;

  // 标题
  $('#view-title b').textContent = who;

  // 入口：自己已经有标记时写"查看"，否则"创建"
  $('#view-cta .cta-text').textContent = hasOwnData() ? '查看我的城市制霸图' : '创建我的城市制霸图';


  // 成就缩略统计：解锁数（彩蛋不计入）、各稀有度数量、最高稀有度的几枚徽章（彩蛋解锁了排最前）
  const list = evaluate(allLevels());
  const counted = list.filter(a => !a.egg);
  const done = list.filter(a => a.done)
    .sort((a, b) => (b.egg - a.egg) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const got = done.filter(a => !a.egg).length;
  const box = $('#view-ach');
  box.innerHTML = `<div class="va-head">
  <svg class="va-cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffd95e"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 20h8" fill="none"/></svg>
  <span>成就</span><b>${got}</b><span class="va-of">/ ${counted.length}</span>
</div>
${got ? `<div class="va-tiers">${TIER_ORDER.map(t => {
    const n = counted.filter(a => a.done && a.tier === t).length;
    return n ? `<span class="va-tier" data-tier="${t}">${TIERS[t]} ${n}</span>` : '';
  }).join('')}</div>
<div class="va-badges"></div>` : '<p class="va-none">还没有解锁成就</p>'}`;

  // 徽章图案在单独的模块里，按需加载（普通访问首页不会下载）
  if (done.length) {
    import('./badges.js').then(({ badge, BADGE_DEFS }) => {
      document.body.insertAdjacentHTML('beforeend', BADGE_DEFS);
      const shown = done.slice(0, SHOW_BADGES);
      const more = done.length - shown.length;
      box.querySelector('.va-badges').innerHTML = shown.map(a =>
        `<span class="va-badge" title="${esc(a.name)}">${badge(a)}</span>`).join('')
        + (more > 0 ? `<span class="va-more">+${more}</span>` : '');
    }).catch(() => { /* 徽章加载失败时只显示数字 */ });
  }
}
