// 成就（随首页加载的部分）：解锁记录、奖杯红点、解锁提示、成就页的打开与独立网址。
// 成就页的界面与样式在 achievements-page.js，第一次打开（或空闲时预加载）才下载。
// 解锁状态由标记数据实时推算。另有两份记录（只存本机）：
//   达成过（known）：决定是否弹"解锁成就"提示——只在第一次达成时提示，失去后再达成不再打扰
//   看过（seen）：点开卡片放大看过才算。没看过的已解锁成就显示 NEW；还有 NEW 时奖杯显示红点
// 标记全部清空时两份记录一起清空，从头再来能重新体验解锁
import { evaluate, unlockedIds } from './achievements.js';
import { allLevels, onChange, viewing } from './store.js';
import { $ } from './dom.js';
import { toast } from './toast.js';
import { openLayer, closeLayer, layerOpen } from './layers.js';

const SEEN_KEY = 'china-ex-city:achievements-seen';
const KNOWN_KEY = 'china-ex-city:achievements-known';
const page = $('#achievements');
const button = $('#trophy');

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
// 启动时已解锁的直接记为达成过，不补弹提示（包括从没有这份记录的旧版本升级上来）。
// 查看模式（别人的分享链接）下数据不是自己的：不记录、不提示、不显示奖杯，下面的事件也都不注册
if (!viewing) remember(unlocked);

// 有已解锁但还没看过的成就时，按钮显示红点
const syncBadge = () => {
  const has = [...unlocked].some(id => !seen.has(id));
  button.classList.toggle('has-new', has);
  button.setAttribute('aria-label', has ? '成就（有新解锁）' : '成就');
};
// 记为看过：点开卡片展示时记一张；"全部标为已看"时记全部已解锁的
export const markSeen = ids => {
  seen = new Set([...seen, ...ids]);
  writeSet(SEEN_KEY, seen);
  syncBadge();
};
export const unseenCount = () => [...unlocked].filter(id => !seen.has(id)).length;
export const isSeen = id => seen.has(id);
export const getUnlocked = () => unlocked;

// ---------- 打开 / 关闭：独立网址 #/achievements；返回键、Esc、返回按钮都回到地图（地图状态不变） ----------
export const ACHIEVEMENTS_HASH = '#/achievements';
const isOpen = () => layerOpen(page);
let pageModule = null;
const loadPage = () => (pageModule ??= import('./achievements-page.js'));
const render = () => pageModule?.then(m => m.render());
let opening = false;
// push=false：网址本来就是 #/achievements（直接打开链接、刷新、浏览器前进）
const open = async (push = true) => {
  if (isOpen() || opening) return;
  opening = true;
  try {
    (await loadPage()).render();
  } finally {
    opening = false;
  }
  if (isOpen()) return;
  openLayer({ el: page, hide: () => { page.hidden = true; }, hash: ACHIEVEMENTS_HASH, push });
  page.scrollTop = 0;
  // 焦点放在页面本身：读屏能读到标题，键盘按 Tab 先到"返回地图"，鼠标用户不会看到按钮上的焦点框
  page.focus({ preventScroll: true });
};

if (viewing) {
  button.hidden = true;
} else {
  button.addEventListener('click', () => open());
  // 预加载成就页：指针移到奖杯上、手指按下时，以及首屏之后的空闲时间（点开时不用等下载）
  button.addEventListener('pointerenter', loadPage, { once: true });
  button.addEventListener('touchstart', loadPage, { once: true, passive: true });
  const idle = window.requestIdleCallback ?? (fn => setTimeout(fn, 3000));
  addEventListener('load', () => idle(loadPage), { once: true });
  page.querySelector('.ach-back').addEventListener('click', closeLayer);
  const openFromUrl = () => { if (location.hash === ACHIEVEMENTS_HASH) open(false); };
  addEventListener('hashchange', openFromUrl);

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
}
