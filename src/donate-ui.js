// 打赏：面板底部「请作者喝奶茶」→ 弹窗显示微信赞赏码（public/pay/zan.jpg）。
// 赞赏码是小程序码，网页无法替用户调起付款，只能用微信扫码或长按识别，所以按所在环境给出对应的提示：
// - 电脑：用手机微信「扫一扫」
// - 微信内置浏览器：长按「识别图中的二维码」
// - 其他手机浏览器：没法用同一台手机扫自己屏幕上的码，长按图片保存到相册（系统自带），再在微信里识别
// 图片在打开弹窗时才加载，首屏不受影响。查看模式（别人的分享链接）不显示入口（见 style.css）
// 换码：替换 public/pay/zan.jpg（只裁出码的白色方块，不要改动码本身）
import { $ } from './dom.js';

const button = $('#donate');
const dialog = $('#donate-dialog');
const img = dialog.querySelector('img');
const caption = dialog.querySelector('figcaption');

const ua = navigator.userAgent;
const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(ua);
const inWechat = /MicroMessenger/i.test(ua);

button.addEventListener('click', () => {
  img.src = './pay/zan.jpg';
  caption.textContent = inWechat ? '长按赞赏码，选择「识别图中的二维码」'
    : isMobile ? '长按赞赏码保存到相册，再打开微信「扫一扫」' : '打开微信「扫一扫」';
  dialog.showModal();
});
