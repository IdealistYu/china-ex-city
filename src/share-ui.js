// 分享：顶栏分享按钮 → 弹窗（可选昵称、复制链接）；手机上加系统分享面板，或复制后打开微信 / QQ。
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
const hint = dialog.querySelector('.share-hint');

const ua = navigator.userAgent;
const inWeChat = /micromessenger/i.test(ua);
const inQQ = /\bqq\//i.test(ua) && !inWeChat;
const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(ua);

const url = () => `${location.origin}${location.pathname}${encodeShare(allLevels(), nameInput.value)}`;
const shareTitle = () => `${cleanName(nameInput.value) || '我'}的城市制霸图`;

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

const open = () => {
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
  refresh();
  // 微信 / QQ 内置浏览器：网页调不起分享，提示用右上角菜单；普通手机浏览器：系统分享面板，不支持时复制后打开 App
  hint.hidden = !(inWeChat || inQQ);
  hint.textContent = inWeChat ? '在微信里：先复制链接，或点右上角 ··· 发送给朋友' : '在 QQ 里：先复制链接，或点右上角 ··· 分享给好友';
  apps.hidden = !isMobile || inWeChat || inQQ;
  apps.querySelector('.native').hidden = !navigator.share;
  apps.querySelector('.wechat').hidden = !!navigator.share;
  apps.querySelector('.qq').hidden = !!navigator.share;
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
  apps.querySelector('.native').addEventListener('click', async () => {
    refresh();
    try {
      await navigator.share({ title: shareTitle(), text: `${shareTitle()}：看看我去过的中国城市`, url: linkInput.value });
    } catch { /* 用户取消 */ }
  });
  // 网页无法直接发给微信 / QQ 好友：复制链接后打开 App，由用户粘贴
  for (const [cls, scheme, name] of [['.wechat', 'weixin://', '微信'], ['.qq', 'mqq://', 'QQ']]) {
    apps.querySelector(cls).addEventListener('click', async () => {
      const ok = await copy();
      toast(ok ? `链接已复制，正在打开${name}…` : '复制失败，请长按链接手动复制');
      if (ok) setTimeout(() => { location.href = scheme; }, 400);
    });
  }
}
