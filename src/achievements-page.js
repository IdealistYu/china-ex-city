// 成就页界面（打开成就页时才加载）：卡牌渲染、筛选、悬停倾斜、点开放大展示。
// 解锁状态、看过记录、红点与解锁提示在 achievements-ui.js（随首页加载）
import { evaluate, CATEGORIES, TIERS } from './achievements.js';
import { allLevels } from './store.js';
import { $, esc } from './dom.js';
import { openLayer, closeLayer } from './layers.js';
import { isSeen, markSeen, unseenCount, getUnlocked } from './achievements-ui.js';
import { badge, BADGE_DEFS } from './badges.js';
import './achievements.css';

const page = $('#achievements');
const grid = page.querySelector('.ach-body');
const summary = page.querySelector('.ach-summary');
const readButton = page.querySelector('.ach-read');
let filter = 'all';
page.insertAdjacentHTML('beforeend', BADGE_DEFS); // 徽章共用的渐变，只插入一次

// 卡片上只有名称与进度 / 品质，所有卡片等高；达成条件（描述）只在点开放大时浮在卡片上方显示。
// big：展示层里放大的那张。内容与列表里的完全相同（等比例放大），只是不显示 NEW
const card = (a, big = false) => {
  const eggLocked = a.egg && !a.done; // 彩蛋：未达成时名称、条件、进度都保密
  const pct = Math.round(a.value / a.goal * 100);
  const isNew = !big && a.done && !isSeen(a.id);
  // 已解锁的卡片可以点开展示，键盘也能操作
  const attrs = a.done && !big ? ` tabindex="0" role="button" aria-label="查看成就：${esc(a.name)}"` : '';
  return `<article class="ach-card ${a.done ? 'done' : 'locked'}${big ? ' big' : ''}" data-tier="${a.tier}" data-id="${a.id}"${attrs}>
  <div class="ach-art"><span class="ach-glyph">${badge(a, eggLocked)}</span>${isNew ? '<span class="ach-new">NEW</span>' : ''}</div>
  <div class="ach-info">
    <h3>${eggLocked ? '???' : esc(a.name)}</h3>
  </div>
  <div class="ach-foot">
    <span class="ach-tier">${a.egg ? '彩蛋' : TIERS[a.tier]}</span>
    ${a.done ? '<span class="ach-state">已解锁</span>' : eggLocked ? '<span class="ach-state">未解锁</span>' : `<span class="ach-progress"><i style="width:${pct}%"></i></span><span class="ach-count">${a.value}/${a.goal}</span>`}
  </div>
</article>`;
};

let list = [];
export const render = () => {
  list = evaluate(allLevels());
  // 彩蛋不计入进度
  const counted = list.filter(a => !a.egg);
  const done = counted.filter(a => a.done).length;
  summary.innerHTML = `<div class="ach-total"><b>${done}</b> / ${counted.length}</div>
<div class="ach-bar"><i style="width:${done / counted.length * 100}%"></i></div>`;
  syncReadButton();
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


// "全部标为已看"：还有没看过的已解锁成就时显示，数字为剩余数量
function syncReadButton() {
  const left = unseenCount();
  readButton.hidden = !left;
  readButton.querySelector('b').textContent = left;
  readButton.setAttribute('aria-label', `全部标为已看（${left} 个）`);
}
readButton.addEventListener('click', () => {
  markSeen(getUnlocked());
  render();
  page.focus({ preventScroll: true }); // 按钮随即隐藏，焦点交还给页面
});
page.querySelector('.ach-filter').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.filter;
  render();
});

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

const desc = show.querySelector('.ach-show-desc'); // 达成条件：浮在放大卡片上方

const showcase = el => {
  const a = list.find(x => x.id === el.dataset.id);
  if (!a) return;
  source = el;
  if (!isSeen(a.id)) {
    markSeen([a.id]);
    el.querySelector('.ach-new')?.remove();
    syncReadButton();
  }
  stage.innerHTML = card(a, true);
  desc.textContent = a.desc;
  desc.classList.remove('on');
  openLayer({ el: show, hide: hideShowcase, animate: false }); // 有自己的飞入动画
  const big = stage.firstElementChild;
  if (reduceMotion.matches) return desc.classList.add('on');
  source.style.visibility = 'hidden';
  // 飞出：从原位置旋转一圈放大到中央，落定后扫过一道闪光。飞行途中不跟随指针（否则落定瞬间会跳一下）
  big.classList.add('flying');
  big.animate([
    { transform: `${fromSource()} rotateY(-180deg)` },
    { transform: 'translate(0, 0) scale(1) rotateY(0)' },
  ], { duration: 650, easing: 'cubic-bezier(.2, .8, .2, 1.05)' })
    .finished.then(() => { big.classList.remove('flying'); big.classList.add('shine'); desc.classList.add('on'); }).catch(() => {});
  show.animate([{ backgroundColor: 'transparent' }, { backgroundColor: getComputedStyle(show).backgroundColor }], { duration: 400, fill: 'backwards' });
};

const hideShowcase = async () => {
  const big = stage.firstElementChild;
  desc.classList.remove('on');
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
