// 全屏弹层（保存图片预览、成就页、成就放大展示）的统一管理：
// - 每打开一层就加一条历史记录：手机返回键、Esc、关闭按钮、点背景都只关闭最上面一层
// - 打开时被遮住的内容设为 inert（Tab、点击、读屏都不会穿透），关闭后焦点回到打开它的元素
// - 可带独立网址（如 #/achievements）；直接用网址打开时没有上一条记录，关闭时改写网址而不是后退
// 原生 <dialog>（导入、导出、清空）由浏览器自己处理 Esc 与返回键，不经过这里

const stack = []; // { el, hide, opener, inerted, depth, direct }

// 把 el 以外、与它及其祖先同级的元素都设为 inert（提示条除外）
const inertOthers = el => {
  const list = [];
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    for (const sib of node.parentElement.children) {
      if (sib === node || sib.inert || sib.id === 'toast' || sib.tagName === 'SCRIPT') continue;
      sib.inert = true;
      list.push(sib);
    }
  }
  return list;
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// 打开一层。hide：真正隐藏的函数（可以是异步动画）；hash：该层的独立网址。
// push=false：当前历史记录本来就是这一层（直接用网址打开、浏览器前进），不再新增记录；
// 这时如果记录上没有层号，说明是直接打开的（direct），关闭时改写网址而不是后退
export const openLayer = ({ el, hide, hash = null, push = true, animate = true }) => {
  if (stack.some(l => l.el === el)) return;
  const layer = { el, hide, opener: document.activeElement };
  if (push) {
    layer.depth = stack.filter(l => !l.direct).length + 1;
    history.pushState({ layer: layer.depth }, '', hash ?? location.href);
  } else {
    layer.depth = history.state?.layer ?? 0;
    layer.direct = !layer.depth;
  }
  el.hidden = false;
  layer.inerted = inertOthers(el);
  stack.push(layer);
  if (animate && !reduceMotion.matches) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
};

const finish = async layer => {
  stack.splice(stack.indexOf(layer), 1);
  await layer.hide();
  for (const n of layer.inerted) n.inert = false;
  if (layer.opener?.isConnected) layer.opener.focus({ preventScroll: true });
};

// 请求关闭最上面一层（按钮、Esc、点背景都走这里）
export const closeLayer = () => {
  const top = stack.at(-1);
  if (!top) return;
  if (top.direct) {
    // 直接从网址打开：没有可以后退的记录，去掉网址里的 hash 后关闭
    history.replaceState(null, '', location.pathname + location.search);
    finish(top);
  } else {
    history.back(); // 在 popstate 里关闭
  }
};

export const layerOpen = el => stack.some(l => l.el === el);

// 后退（返回键、浏览器后退、closeLayer 触发）：关闭层号比当前记录深的层
addEventListener('popstate', e => {
  const depth = e.state?.layer ?? 0;
  for (const l of [...stack].reverse()) if (!l.direct && l.depth > depth) finish(l);
});

// Esc：捕获阶段处理，避免同时触发地图上的"返回全国"等操作；原生对话框打开时交给浏览器
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !stack.length || document.querySelector('dialog[open]')) return;
  e.stopPropagation();
  e.preventDefault();
  closeLayer();
}, true);

// 原生对话框（导入、导出、清空）：点对话框外的背景关闭，和 Esc 一样视为取消
for (const d of document.querySelectorAll('dialog')) {
  d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });
}
