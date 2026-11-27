// 打赏：面板底部「请作者喝奶茶」→ 弹窗显示微信赞赏码（public/pay/zan.jpg）。
// 赞赏码是小程序码，网页无法替用户调起付款，只能用微信扫码或长按识别，所以按所在环境给出对应的提示：
// - 电脑：用手机微信「扫一扫」
// - 微信内置浏览器：长按「识别图中的二维码」
// - 其他手机浏览器：没法用同一台手机扫自己屏幕上的码，提供「保存赞赏码」，存到相册后在微信里识别
// 图片在打开弹窗时才加载，首屏不受影响。查看模式（别人的分享链接）不显示入口（见 style.css）
// 换码：替换 public/pay/zan.jpg（只裁出码的白色方块，不要改动码本身）
import { $ } from './dom.js';
import { canDownload, download } from './download.js';

const button = $('#donate');
const dialog = $('#donate-dialog');
const img = dialog.querySelector('img');
const caption = dialog.querySelector('figcaption');
const apps = dialog.querySelector('.donate-apps');
const saveButton = apps.querySelector('.save-code');

const ua = navigator.userAgent;
const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(ua);
const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
const inWechat = /MicroMessenger/i.test(ua);

const CODE = './pay/zan.jpg';

const open = () => {
  img.src = CODE;
  caption.textContent = inWechat ? '长按赞赏码，选择「识别图中的二维码」'
    : isMobile ? '保存到相册后，打开微信「扫一扫」' : '打开微信「扫一扫」';
  apps.hidden = !isMobile || inWechat;
  dialog.showModal();
};

button.addEventListener('click', open);

// 提示写在码下方的说明里（弹窗在最上层，底部提示条会被遮罩盖住）
saveButton.addEventListener('click', () => {
  // iPhone 下载的图片进「文件」而不是相册，微博、QQ 等内置浏览器不支持下载：都改为提示长按图片保存
  if (isIOS) caption.textContent = '请长按赞赏码，选择「存储到照片」';
  else if (!canDownload()) caption.textContent = '请长按赞赏码，保存图片到相册';
  else {
    download(CODE, '城市制霸-赞赏码.jpg');
    caption.textContent = '已保存，打开微信「扫一扫」，从相册选择这张图';
  }
});
