// 标记数据：{ 行政区划代码: 等级 }，存 localStorage。以代码为 key，地图数据增删城市不会错位。
// 查看模式（打开别人的分享链接 #/s/…）：数据来自链接，只在内存里，不读写 localStorage、不同步、不可修改
import { decodeShare } from './share.js';

const KEY = 'china-ex-city:v1';

// 只接受 6 位代码 + 1～5 的整数等级；手动改坏或旧格式的数据直接丢弃，避免分数算出 NaN
const sanitize = data => {
  const out = {};
  if (data && typeof data === 'object') {
    for (const [code, level] of Object.entries(data)) {
      if (/^\d{6}$/.test(code) && Number.isInteger(level) && level >= 1 && level <= 5) out[code] = level;
    }
  }
  return out;
};

const read = () => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return {};
  }
};

const shared = decodeShare(location.hash);
// 查看模式：{ name: 分享者昵称, key: 链接里的分享部分 }；普通模式为 null
export const viewing = shared && { name: shared.name, key: shared.key };
let levels = shared ? sanitize(shared.levels) : read();
const listeners = new Set();

// 自己是否有标记（查看模式下决定入口写"创建"还是"查看"我的制霸图）
export const hasOwnData = () => Object.keys(viewing ? read() : levels).length > 0;


export const getLevel = code => levels[code] ?? 0;

export const setLevel = (code, level) => {
  if (viewing) return; // 查看模式只读
  if (level) levels[code] = level;
  else delete levels[code];
  try {
    localStorage.setItem(KEY, JSON.stringify(levels));
  } catch { /* 隐私模式等场景写不进去，页面照常可用 */ }
  listeners.forEach(fn => fn(code, level));
};

export const allLevels = () => ({ ...levels });

// 整体替换（导入备份时用），写入后通知全部重绘
export const replaceAll = next => {
  if (viewing) return;
  levels = sanitize(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(levels));
  } catch { /* 同上 */ }
  listeners.forEach(fn => fn(null));
};

// fn(code, level)；code 为 null 表示整体变化（其他标签页改了数据），需要全部重绘
export const onChange = fn => listeners.add(fn);

// 多标签页同步：别的标签页写入后这里同步过来，否则两边各自覆盖对方的修改
addEventListener('storage', e => {
  if (viewing || (e.key !== KEY && e.key !== null)) return;
  levels = read();
  listeners.forEach(fn => fn(null));
});
