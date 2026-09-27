// 成就页：顶栏奖杯按钮打开的全屏页面，卡牌式展示各成就的收集情况。
// 解锁状态由标记数据实时推算；另记一份"已看过"的成就，用于按钮红点和卡片上的 NEW 标记
import { evaluate, unlockedIds, CATEGORIES, TIERS } from './achievements.js';
import { allLevels, onChange } from './store.js';
import { $, esc } from './dom.js';
import { toast } from './toast.js';
import './achievements.css';

const SEEN_KEY = 'china-ex-city:achievements-seen';
const page = $('#achievements');
const button = $('#trophy');
const grid = page.querySelector('.ach-body');
const summary = page.querySelector('.ach-summary');
let filter = 'all';

const readSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) ?? []); } catch { return new Set(); }
};
const writeSeen = ids => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch { /* 忽略 */ }
};
let seen = readSeen();
let unlocked = unlockedIds(allLevels());

// 有解锁了但还没看过的成就时，按钮显示红点
const syncBadge = () => {
  const fresh = [...unlocked].some(id => !seen.has(id));
  button.classList.toggle('has-new', fresh);
  button.setAttribute('aria-label', fresh ? '成就（有新解锁）' : '成就');
};

// big：展示层里放大的那张（多一行类别，不显示 NEW）
const card = (a, big = false) => {
  const hidden = a.secret && !a.done;
  const pct = Math.round(a.value / a.goal * 100);
  const isNew = !big && a.done && !seen.has(a.id);
  const glyph = hidden ? '?' : a.glyph;
  // 已解锁的卡片可以点开展示，键盘也能操作
  const attrs = a.done && !big ? ` tabindex="0" role="button" aria-label="查看成就：${esc(a.name)}"` : '';
  return `<article class="ach-card ${a.done ? 'done' : 'locked'}${big ? ' big' : ''}" data-tier="${a.tier}" data-id="${a.id}"${attrs}>
  <div class="ach-art"><span class="ach-glyph" data-len="${[...glyph].length}">${esc(glyph)}</span>${isNew ? '<span class="ach-new">NEW</span>' : ''}</div>
  <div class="ach-info">
    ${big ? `<div class="ach-kind">${esc(CATEGORIES.find(c => c.id === a.cat).name)}成就 · ${TIERS[a.tier]}</div>` : ''}
    <h3>${hidden ? '???' : esc(a.name)}</h3>
    <p>${hidden ? '隐藏成就，达成后揭晓' : esc(a.desc)}</p>
  </div>
  <div class="ach-foot">
    <span class="ach-tier">${TIERS[a.tier]}</span>
    ${a.done ? '<span class="ach-state">已解锁</span>' : `<span class="ach-progress"><i style="width:${pct}%"></i></span><span class="ach-count">${a.value}/${a.goal}</span>`}
  </div>
</article>`;
};

let list = [];
const render = () => {
  list = evaluate(allLevels());
  const done = list.filter(a => a.done).length;
  summary.innerHTML = `<div class="ach-total"><b>${done}</b> / ${list.length}</div>
<div class="ach-bar"><i style="width:${done / list.length * 100}%"></i></div>`;
  const shown = list.filter(a => filter === 'all' || (filter === 'done' ? a.done : !a.done));
  grid.innerHTML = CATEGORIES.map(c => {
    const items = shown.filter(a => a.cat === c.id);
    if (!items.length) return '';
    const got = list.filter(a => a.cat === c.id && a.done).length;
    const total = list.filter(a => a.cat === c.id).length;
    return `<section><h2>${esc(c.name)}<small>${got} / ${total}</small></h2><div class="ach-grid">${items.map(a => card(a)).join('')}</div></section>`;
  }).join('') || '<p class="ach-empty">这里还空空如也</p>';
  for (const b of page.querySelectorAll('.ach-filter button')) b.setAttribute('aria-pressed', b.dataset.filter === filter);
};

// ---------- 打开 / 关闭：进入时加一条历史记录，返回键或 Esc 回到地图（地图状态不变） ----------
const isOpen = () => !page.hidden;
const open = () => {
  if (isOpen()) return;
  render();
  page.hidden = false;
  page.scrollTop = 0;
  history.pushState({ achievements: true }, '');
  page.querySelector('.ach-back').focus();
  // 看过即清除红点；本次渲染里的 NEW 标记保留到下次打开
  seen = new Set([...seen, ...unlocked]);
  writeSeen(seen);
  syncBadge();
};
const hide = () => {
  if (isShowing()) { show.hidden = true; stage.innerHTML = ''; if (source) source.style.visibility = ''; source = null; }
  page.hidden = true;
  button.focus();
};
const close = () => {
  if (history.state?.achievements) history.back(); // popstate 里隐藏
  else hide();
};

button.addEventListener('click', open);
page.querySelector('.ach-back').addEventListener('click', close);
page.querySelector('.ach-filter').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.filter;
  render();
});
addEventListener('popstate', () => { if (isOpen() && !history.state?.achievements) hide(); });
// 捕获阶段处理 Esc，避免同时触发地图上的"返回全国"
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !isOpen()) return;
  e.stopPropagation();
  if (isShowing()) hideShowcase();
  else close();
}, true);

// ---------- 悬停：卡片随指针倾斜，高光跟随（只对鼠标等精确指针） ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const tilt = (el, e, max) => {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--mx', `${x * 100}%`);
  el.style.setProperty('--my', `${y * 100}%`);
  if (reduceMotion.matches) return;
  el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`);
  el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`);
};
const untilt = el => { for (const k of ['--mx', '--my', '--rx', '--ry']) el.style.removeProperty(k); };
grid.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('.ach-card');
  if (el) tilt(el, e, el.classList.contains('done') ? 9 : 4);
});
grid.addEventListener('pointerout', e => {
  const el = e.target.closest('.ach-card');
  if (el && !el.contains(e.relatedTarget)) untilt(el);
});

// ---------- 点击已解锁的卡片：放大展示；未解锁的轻轻晃一下 ----------
const show = page.querySelector('.ach-show');
const stage = show.querySelector('.ach-stage');
let source = null; // 被点开的原卡片（关闭时飞回去）
const isShowing = () => !show.hidden;

// 原卡片 → 展示位置的变换（从原卡片的位置和大小出发）
const fromSource = () => {
  const a = source.getBoundingClientRect(), b = stage.firstElementChild.getBoundingClientRect();
  const k = a.width / b.width;
  return `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${k})`;
};

const showcase = el => {
  const a = list.find(x => x.id === el.dataset.id);
  if (!a) return;
  source = el;
  stage.innerHTML = card(a, true);
  show.hidden = false;
  const big = stage.firstElementChild;
  if (reduceMotion.matches) return;
  source.style.visibility = 'hidden';
  // 飞出：从原位置旋转一圈放大到中央，落定后扫过一道闪光
  big.animate([
    { transform: `${fromSource()} rotateY(-180deg)` },
    { transform: 'translate(0, 0) scale(1) rotateY(0)' },
  ], { duration: 650, easing: 'cubic-bezier(.2, .8, .2, 1.05)' })
    .finished.then(() => big.classList.add('shine')).catch(() => {});
  show.animate([{ backgroundColor: 'rgba(20, 18, 14, 0)' }, { backgroundColor: 'rgba(20, 18, 14, .72)' }], { duration: 400, fill: 'backwards' });
};

const hideShowcase = async () => {
  if (!isShowing()) return;
  const big = stage.firstElementChild;
  if (!reduceMotion.matches && source?.isConnected) {
    big.classList.remove('shine');
    const flyBack = big.animate([
      { transform: getComputedStyle(big).transform === 'none' ? 'none' : getComputedStyle(big).transform },
      { transform: fromSource() },
    ], { duration: 320, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' });
    show.animate([{ backgroundColor: 'rgba(20, 18, 14, .72)' }, { backgroundColor: 'rgba(20, 18, 14, 0)' }], { duration: 320, fill: 'forwards' });
    await flyBack.finished.catch(() => {});
  }
  show.hidden = true;
  stage.innerHTML = '';
  for (const a of show.getAnimations()) a.cancel();
  if (source) { source.style.visibility = ''; source.focus({ preventScroll: true }); }
  source = null;
};

grid.addEventListener('click', e => {
  const el = e.target.closest('.ach-card');
  if (!el) return;
  if (el.classList.contains('done')) return showcase(el);
  el.classList.remove('nope');
  void el.offsetWidth; // 重启动画
  el.classList.add('nope');
});
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.ach-card.done')) {
    e.preventDefault();
    showcase(e.target);
  }
});
show.addEventListener('click', hideShowcase);
// 展示中的大卡片同样随指针（含手指拖动）倾斜
show.addEventListener('pointermove', e => {
  const big = stage.firstElementChild;
  if (big) tilt(big, e, 14);
});
show.addEventListener('pointerleave', () => { if (stage.firstElementChild) untilt(stage.firstElementChild); });

// ---------- 标记城市时解锁新成就：底部提示 ----------
onChange(code => {
  const next = unlockedIds(allLevels());
  const gained = [...next].filter(id => !unlocked.has(id));
  unlocked = next;
  syncBadge();
  if (isOpen()) render();
  // 导入备份、其他标签页同步（code 为 null）时不逐个提示
  if (code === null || !gained.length) return;
  const names = evaluate(allLevels()).filter(a => gained.includes(a.id)).map(a => `「${a.name}」`);
  toast(names.length === 1 ? `解锁成就${names[0]}` : `解锁 ${names.length} 个成就：${names.join('')}`, 4000);
});

syncBadge();
