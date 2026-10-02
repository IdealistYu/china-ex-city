// 分享：顶栏分享按钮 → 弹窗（可选昵称、复制链接）；手机上另有「复制链接并打开微信 / QQ」。
// 链接里带着全部标记，对方打开即是只读的查看模式（见 share.js、view-ui.js）。查看模式下不显示分享入口
import { encodeShare, cleanName } from './share.js';
import { allLevels, viewing } from './store.js';
import { tally } from './levels.js';
import { units } from './map.js';
import { evaluate } from './achievements.js';
import { $ } from './dom.js';
import { toast } from './toast.js';

const NAME_KEY = 'china-ex-city:share-name'; // 上次填的昵称（只是方便，不属于标记数据）
const button = $('#share');
const dialog = $('#share-dialog');
const nameInput = dialog.querySelector('.share-name input');
const linkInput = dialog.querySelector('.share-link input');
const copyButton = dialog.querySelector('.copy');
const apps = dialog.querySelector('.share-apps');
const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent);

const url = () => `${location.origin}${location.pathname}${encodeShare(allLevels(), nameInput.value)}`;

const refresh = () => {
  linkInput.value = url();
  try { localStorage.setItem(NAME_KEY, cleanName(nameInput.value)); } catch { /* 忽略 */ }
};

// 复制：优先剪贴板接口，不可用时（部分内置浏览器）退回选中输入框复制
const copy = async () => {
  refresh();
  try {
    await navigator.clipboard.writeText(linkInput.value);
    return true;
  } catch {
    linkInput.select();
    try { return document.execCommand('copy'); } catch { return false; }
  }
};

// 昵称字体（完整版得意黑分块）的声明：打开分享弹窗时才加载，首页不受影响
const loadNameFont = () => import('./fonts/name.css').catch(() => { /* 失败时昵称用系统字体 */ });

const open = () => {
  loadNameFont();
  const levels = allLevels();
  const t = tally(levels, units);
  const list = evaluate(levels).filter(a => !a.egg);
  const got = list.filter(a => a.done).length;
  const empty = !t.visited;
  dialog.querySelector('.share-sum').textContent = empty
    ? '还没有标记任何城市，先去点亮几座再来分享吧！'
    : `已去 ${t.visited} 座城市 · ${t.score} 分 · 成就 ${got} / ${list.length}。对方打开链接即可查看你的制霸图。`;
  try { nameInput.value = localStorage.getItem(NAME_KEY) ?? ''; } catch { nameInput.value = ''; }
  for (const el of [nameInput, linkInput, copyButton, ...apps.querySelectorAll('button')]) el.disabled = empty;
  apps.hidden = !isMobile;
  refresh();
  dialog.showModal();
};

if (viewing) {
  button.hidden = true;
} else {
  button.addEventListener('click', open);
  nameInput.addEventListener('input', refresh);
  linkInput.addEventListener('focus', () => linkInput.select());
  copyButton.addEventListener('click', async () => {
    if (await copy()) {
      toast('链接已复制，发给朋友吧');
      copyButton.textContent = '已复制';
      setTimeout(() => { copyButton.textContent = '复制链接'; }, 2000);
    } else {
      toast('复制失败，请长按链接手动复制');
    }
  });
  // 网页无法直接发给微信 / QQ 好友：复制链接后打开 App，由用户粘贴发送
  for (const [cls, scheme, name] of [['.wechat', 'weixin://', '微信'], ['.qq', 'mqq://', 'QQ']]) {
    apps.querySelector(cls).addEventListener('click', async () => {
      const ok = await copy();
      toast(ok ? `链接已复制，正在打开${name}…` : '复制失败，请长按链接手动复制');
      if (ok) setTimeout(() => { location.href = scheme; }, 400);
    });
  }
}
