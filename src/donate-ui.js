// 打赏：面板底部「请作者喝奶茶」→ 弹窗显示二合一付款码（public/pay/tip.png，内容是本站 /pay.html，
// 扫码后由 pay.html 按 App 分流）。手机上没法用同一台手机扫自己屏幕上的码，所以按所在环境换成能直接付款的形式：
// - 微信内置浏览器：显示微信收款码，长按「识别图中的二维码」即可付款
// - 支付宝内置浏览器：「打开支付宝付款」直接跳转
// - 其他手机浏览器：「保存付款码」存到相册后去微信 / 支付宝扫；装了支付宝的也可以直接打开
// 图片在打开弹窗时才加载，首屏不受影响。查看模式（别人的分享链接）不显示入口（见 style.css）
// 换收款码：scripts/build-pay.mjs 重新生成图片，并同步这里、index.html 与 public/pay.html 的支付宝网址
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
const app = /AlipayClient/i.test(ua) ? 'alipay' : /MicroMessenger/i.test(ua) ? 'wechat' : 'other';

const CODE = './pay/tip.png';
const WECHAT_CODE = './pay/wechat.png';

const open = () => {
  if (app === 'wechat') {
    img.src = WECHAT_CODE;
    img.alt = '微信收款码';
    caption.textContent = '长按二维码，选择「识别图中的二维码」';
  } else {
    img.src = CODE;
    caption.textContent = app === 'alipay' ? '点下方按钮，直接用支付宝付款' : isMobile ? '保存到相册后，打开微信或支付宝「扫一扫」' : '打开微信或支付宝「扫一扫」';
  }
  apps.hidden = !isMobile || app === 'wechat';
  saveButton.hidden = app === 'alipay';
  dialog.showModal();
};

button.addEventListener('click', open);

// 提示写在码下方的说明里（弹窗在最上层，底部提示条会被遮罩盖住）
saveButton.addEventListener('click', () => {
  // iPhone 下载的图片进「文件」而不是相册，微博、QQ 等内置浏览器不支持下载：都改为提示长按图片保存
  if (isIOS) caption.textContent = '请长按二维码，选择「存储到照片」';
  else if (!canDownload()) caption.textContent = '请长按二维码，保存图片到相册';
  else {
    download(CODE, '城市制霸-打赏码.png');
    caption.textContent = '已保存，打开微信或支付宝「扫一扫」，从相册选择这张图';
  }
});
