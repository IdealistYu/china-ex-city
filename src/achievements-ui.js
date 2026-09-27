// 成就页：顶栏奖杯按钮打开的全屏页面，卡牌式展示各成就的收集情况。
// 解锁状态由标记数据实时推算。另有两份记录（只存本机）：
//   达成过（known）：决定是否弹"解锁成就"提示——只在第一次达成时提示，失去后再达成不再打扰
//   看过（seen）：点开卡片放大看过才算。没看过的已解锁成就显示 NEW；还有 NEW 时奖杯显示红点
// 标记全部清空时两份记录一起清空，从头再来能重新体验解锁
import { evaluate, unlockedIds, CATEGORIES, TIERS } from './achievements.js';
import { allLevels, onChange } from './store.js';
import { $, esc } from './dom.js';
import { toast } from './toast.js';
import { openLayer, closeLayer, layerOpen } from './layers.js';
import './achievements.css';

const SEEN_KEY = 'china-ex-city:achievements-seen';
const KNOWN_KEY = 'china-ex-city:achievements-known';
const page = $('#achievements');
const button = $('#trophy');
const grid = page.querySelector('.ach-body');
const summary = page.querySelector('.ach-summary');
let filter = 'all';

const readSet = key => {
  try { return new Set(JSON.parse(localStorage.getItem(key)) ?? []); } catch { return new Set(); }
};
const writeSet = (key, ids) => {
  try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* 隐私模式等写不进去：只在本次访问内有效 */ }
};
let seen = readSet(SEEN_KEY);
let known = readSet(KNOWN_KEY);
let unlocked = unlockedIds(allLevels());

// 记为达成过；返回其中第一次达成的
const remember = ids => {
  const first = [...ids].filter(id => !known.has(id));
  if (first.length) {
    first.forEach(id => known.add(id));
    writeSet(KNOWN_KEY, known);
  }
  return first;
};
// 启动时已解锁的直接记为达成过，不补弹提示（包括从没有这份记录的旧版本升级上来）
remember(unlocked);

// 有已解锁但还没看过的成就时，按钮显示红点
const syncBadge = () => {
  const has = [...unlocked].some(id => !seen.has(id));
  button.classList.toggle('has-new', has);
  button.setAttribute('aria-label', has ? '成就（有新解锁）' : '成就');
};
// 记为看过：点开卡片展示时记一张；"全部标为已看"时记全部已解锁的
const markSeen = ids => {
  seen = new Set([...seen, ...ids]);
  writeSet(SEEN_KEY, seen);
  syncBadge();
};
const unseenCount = () => [...unlocked].filter(id => !seen.has(id)).length;

// big：展示层里放大的那张（多一行类别，不显示 NEW）
const card = (a, big = false) => {
  const hidden = a.secret && !a.done;
  const eggLocked = a.egg && !a.done; // 彩蛋：未达成时名称、条件、进度都保密
  const pct = Math.round(a.value / a.goal * 100);
  const isNew = !big && a.done && !seen.has(a.id);
  const glyph = hidden || eggLocked ? '?' : a.glyph;
  const desc = hidden ? '隐藏成就，达成后揭晓' : eggLocked ? '彩蛋成就，达成条件保密' : a.desc;
  // 已解锁的卡片可以点开展示，键盘也能操作
  const attrs = a.done && !big ? ` tabindex="0" role="button" aria-label="查看成就：${esc(a.name)}"` : '';
  return `<article class="ach-card ${a.done ? 'done' : 'locked'}${big ? ' big' : ''}" data-tier="${a.tier}" data-id="${a.id}"${attrs}>
  <div class="ach-art"><span class="ach-glyph" data-len="${[...glyph].length}">${esc(glyph)}</span>${isNew ? '<span class="ach-new">NEW</span>' : ''}</div>
  <div class="ach-info">
    ${big ? `<div class="ach-kind">${esc(CATEGORIES.find(c => c.id === a.cat).name)}成就 · ${a.egg ? '彩蛋' : TIERS[a.tier]}</div>` : ''}
    <h3>${hidden || eggLocked ? '???' : esc(a.name)}</h3>
    <p>${esc(desc)}</p>
  </div>
  <div class="ach-foot">
    <span class="ach-tier">${a.egg ? '彩蛋' : TIERS[a.tier]}</span>
    ${a.done ? '<span class="ach-state">已解锁</span>' : eggLocked ? '<span class="ach-state">未解锁</span>' : `<span class="ach-progress"><i style="width:${pct}%"></i></span><span class="ach-count">${a.value}/${a.goal}</span>`}
  </div>
</article>`;
};

let list = [];
const render = () => {
  list = evaluate(allLevels());
  // 彩蛋不计入进度
  const counted = list.filter(a => !a.egg);
  const done = counted.filter(a => a.done).length;
  const unseen = unseenCount();
  summary.innerHTML = `<div class="ach-total"><b>${done}</b> / ${counted.length}</div>
<div class="ach-bar"><i style="width:${done / counted.length * 100}%"></i></div>
${unseen ? `<button class="ach-read" type="button">全部标为已看（${unseen}）</button>` : ''}`;
  const shown = list.filter(a => filter === 'all' || (filter === 'done' ? a.done : !a.done));
  grid.innerHTML = CATEGORIES.map(c => {
    const items = shown.filter(a => a.cat === c.id);
    if (!items.length) return '';
    const got = counted.filter(a => a.cat === c.id && a.done).length;
    const total = counted.filter(a => a.cat === c.id).length;
    return `<section><h2>${esc(c.name)}<small>${got} / ${total}</small></h2><div class="ach-grid">${items.map(a => `<div class="ach-slot">${card(a)}</div>`).join('')}</div></section>`;
  }).join('') || '<p class="ach-empty">这里还空空如也</p>';
  for (const b of page.querySelectorAll('.ach-filter button')) b.setAttribute('aria-pressed', b.dataset.filter === filter);
};

// ---------- 打开 / 关闭：独立网址 #/achievements；返回键、Esc、返回按钮都回到地图（地图状态不变） ----------
export const ACHIEVEMENTS_HASH = '#/achievements';
const isOpen = () => layerOpen(page);
// push=false：网址本来就是 #/achievements（直接打开链接、刷新、浏览器前进）
const open = (push = true) => {
  if (isOpen()) return;
  render();
  openLayer({ el: page, hide: () => { page.hidden = true; }, hash: ACHIEVEMENTS_HASH, push });
  page.scrollTop = 0;
  // 焦点放在页面本身：读屏能读到标题，键盘按 Tab 先到"返回地图"，鼠标用户不会看到按钮上的焦点框
  page.focus({ preventScroll: true });
};
summary.addEventListener('click', e => {
  if (!e.target.closest('.ach-read')) return;
  markSeen(unlocked);
  render();
});

button.addEventListener('click', () => open());
page.querySelector('.ach-back').addEventListener('click', closeLayer);
page.querySelector('.ach-filter').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.filter;
  render();
});
const openFromUrl = () => { if (location.hash === ACHIEVEMENTS_HASH) open(false); };
addEventListener('hashchange', openFromUrl);

// ---------- 悬停：卡片随指针倾斜，高光跟随（只对鼠标等精确指针） ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
// 最大倾斜角（度）：列表里已解锁 / 未解锁、放大展示
const TILT = { done: 6, locked: 3, big: 8 };
const clamp01 = v => Math.min(1, Math.max(0, v));
// area：不随卡片移动的外层（列表里的卡槽、放大展示的舞台）。按它计算位置和判断悬停：
// 卡片悬停时会上抬、倾斜，若按卡片自身计算，指针在边缘时会一会儿在卡片里、一会儿在外面，来回抖动
const tilt = (el, e, max, area) => {
  const r = area.getBoundingClientRect();
  // 指针超出范围时按边缘计算，角度不会超过 max（放大展示时整个背景都响应指针，不限制会转过头翻面）
  const x = clamp01((e.clientX - r.left) / r.width), y = clamp01((e.clientY - r.top) / r.height);
  el.style.setProperty('--mx', `${x * 100}%`);
  el.style.setProperty('--my', `${y * 100}%`);
  if (reduceMotion.matches) return;
  el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`);
  el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`);
};
const untilt = el => { for (const k of ['--mx', '--my', '--rx', '--ry']) el.style.removeProperty(k); };
grid.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const slot = e.target.closest('.ach-slot');
  const el = slot?.firstElementChild;
  if (el) tilt(el, e, el.classList.contains('done') ? TILT.done : TILT.locked, slot);
});
grid.addEventListener('pointerout', e => {
  const slot = e.target.closest('.ach-slot');
  if (slot && !slot.contains(e.relatedTarget)) untilt(slot.firstElementChild);
});

// ---------- 点击已解锁的卡片：放大展示；未解锁的轻轻晃一下 ----------
const show = page.querySelector('.ach-show');
const stage = show.querySelector('.ach-stage');
let source = null; // 被点开的原卡片（关闭时飞回去）

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
  if (!seen.has(a.id)) {
    markSeen([a.id]);
    el.querySelector('.ach-new')?.remove();
    const read = summary.querySelector('.ach-read');
    const left = unseenCount();
    if (read) left ? (read.textContent = `全部标为已看（${left}）`) : read.remove();
  }
  stage.innerHTML = card(a, true);
  openLayer({ el: show, hide: hideShowcase, animate: false }); // 有自己的飞入动画
  const big = stage.firstElementChild;
  if (reduceMotion.matches) return;
  source.style.visibility = 'hidden';
  // 飞出：从原位置旋转一圈放大到中央，落定后扫过一道闪光。飞行途中不跟随指针（否则落定瞬间会跳一下）
  big.classList.add('flying');
  big.animate([
    { transform: `${fromSource()} rotateY(-180deg)` },
    { transform: 'translate(0, 0) scale(1) rotateY(0)' },
  ], { duration: 650, easing: 'cubic-bezier(.2, .8, .2, 1.05)' })
    .finished.then(() => { big.classList.remove('flying'); big.classList.add('shine'); }).catch(() => {});
  show.animate([{ backgroundColor: 'transparent' }, { backgroundColor: getComputedStyle(show).backgroundColor }], { duration: 400, fill: 'backwards' });
};

const hideShowcase = async () => {
  const big = stage.firstElementChild;
  if (!reduceMotion.matches && source?.isConnected) {
    big.classList.remove('shine');
    const flyBack = big.animate([
      { transform: getComputedStyle(big).transform === 'none' ? 'none' : getComputedStyle(big).transform },
      { transform: fromSource() },
    ], { duration: 320, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' });
    show.animate([{ backgroundColor: getComputedStyle(show).backgroundColor }, { backgroundColor: 'transparent' }], { duration: 320, fill: 'forwards' });
    await flyBack.finished.catch(() => {});
  }
  show.hidden = true;
  stage.innerHTML = '';
  for (const a of show.getAnimations()) a.cancel();
  if (source) source.style.visibility = '';
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
show.addEventListener('click', closeLayer);
// 展示中的大卡片同样随指针（含手指拖动）倾斜
show.addEventListener('pointermove', e => {
  const big = stage.firstElementChild;
  if (big && !big.classList.contains('flying')) tilt(big, e, TILT.big, stage);
});
show.addEventListener('pointerleave', () => { if (stage.firstElementChild) untilt(stage.firstElementChild); });

// ---------- 标记城市时解锁新成就：底部提示 ----------
onChange(code => {
  const levels = allLevels();
  unlocked = unlockedIds(levels);
  if (!Object.keys(levels).length) {
    // 标记全部清空：成就记录一起重置
    known = new Set();
    seen = new Set();
    writeSet(KNOWN_KEY, known);
    writeSet(SEEN_KEY, seen);
  }
  const first = remember(unlocked);
  if (isOpen()) render(); // 成就页开着时解锁（其他标签页同步过来）：直接出现，带 NEW
  syncBadge();
  // 只提示第一次达成的；导入备份、其他标签页同步（code 为 null）时不逐个提示
  if (code === null || !first.length) return;
  const names = evaluate(levels).filter(a => first.includes(a.id)).map(a => `「${a.name}」`);
  toast(names.length === 1 ? `解锁成就${names[0]}` : `解锁 ${names.length} 个成就：${names.join('')}`, 4000);
});

// 多标签页：另一个标签页看过成就或记录变化，这里的红点同步
addEventListener('storage', e => {
  if (e.key !== SEEN_KEY && e.key !== KNOWN_KEY && e.key !== null) return;
  seen = readSet(SEEN_KEY);
  known = readSet(KNOWN_KEY);
  syncBadge();
  if (isOpen()) render();
});

syncBadge();
openFromUrl();
