// 打赏：面板底部「请作者喝奶茶」→ 弹窗显示微信赞赏码（public/pay/zan.jpg）。
// 赞赏码是小程序码，网页无法替用户调起付款，只能用微信扫码或长按识别，所以按所在环境给出对应的提示：
// - 电脑：用手机微信「扫一扫」
// - 微信内置浏览器：长按「识别图中的二维码」
// - 其他手机浏览器：没法用同一台手机扫自己屏幕上的码，提供「保存赞赏码」，存到相册后在微信里识别。
//   iPhone 网页下载的图片进「文件」而不是相册，改用系统分享面板（其中有「存储图像」）
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
const FILENAME = '城市制霸-赞赏码.jpg';
let codeFile = null; // iPhone 分享用的图片文件：打开弹窗时预先取好，点击时同步调用分享（Safari 要求在点击当下调用）

const open = () => {
  img.src = CODE;
  caption.classList.remove('notice');
  caption.textContent = inWechat ? '长按赞赏码，选择「识别图中的二维码」'
    : isMobile ? '保存到相册后，打开微信「扫一扫」' : '打开微信「扫一扫」';
  apps.hidden = !isMobile || inWechat;
  if (isIOS && !inWechat && !codeFile && navigator.canShare) {
    fetch(CODE).then(r => r.blob()).then(b => { codeFile = new File([b], FILENAME, { type: 'image/jpeg' }); }).catch(() => { /* 失败时退回长按保存的提示 */ });
  }
  dialog.showModal();
};

button.addEventListener('click', open);

// 提示写在码下方的说明里并高亮（弹窗在最上层，底部提示条会被遮罩盖住）
const notice = text => {
  caption.textContent = text;
  caption.classList.remove('notice');
  void caption.offsetWidth; // 重新触发高亮动画
  caption.classList.add('notice');
};

saveButton.addEventListener('click', () => {
  if (isIOS) {
    if (codeFile && navigator.canShare?.({ files: [codeFile] })) {
      notice('在弹出的菜单里选「存储图像」');
      navigator.share({ files: [codeFile] })
        .then(() => notice('存好后打开微信「扫一扫」，从相册选择这张图'))
        .catch(() => notice('也可以长按赞赏码，选择「存储到照片」'));
    } else {
      notice('请长按赞赏码，选择「存储到照片」');
    }
  } else if (!canDownload()) {
    notice('请长按赞赏码，保存图片到相册'); // 微博、QQ 等内置浏览器不支持下载
  } else {
    download(CODE, FILENAME);
    notice('已保存，打开微信「扫一扫」，从相册选择这张图');
  }
});
