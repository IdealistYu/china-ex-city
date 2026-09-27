// "保存图片"按钮与导出结果弹层
import { allLevels } from './store.js';
import { exportImage } from './export.js';
import { exportProvinceImage } from './export-province.js';
import { provinceByCode } from './map.js';
import { $ } from './dom.js';
import { openLayer, closeLayer } from './layers.js';

const output = $('#output');
const saveButton = $('#save');
const closeButton = output.querySelector('button');
let outputUrl = null;
let target = null; // 当前省视图的省份代码；null 为全国

// 按钮随视图切换：全国视图导出全国图，省视图导出当前省（手机只显示图标，文字写进无障碍标签与提示）
export const setExportTarget = code => {
  target = code;
  const label = code ? `保存${provinceByCode.get(code).short}图` : '保存全国图';
  saveButton.querySelector('span').textContent = label;
  saveButton.setAttribute('aria-label', label);
  saveButton.title = label;
};


saveButton.addEventListener('click', async () => {
  if (saveButton.disabled) return; // 生成中，防止重复点击
  saveButton.disabled = true;
  document.documentElement.dataset.busy = '';
  try {
    const url = target ? await exportProvinceImage(target, allLevels()) : await exportImage(allLevels());
    if (outputUrl) URL.revokeObjectURL(outputUrl); // 释放上一次导出的图片
    outputUrl = url;
    output.querySelector('img').src = url;
    openLayer({ el: output, hide: () => { output.hidden = true; } }); // 返回键、Esc 也能关闭，关闭后焦点回到保存按钮
    closeButton.focus();
  } catch (err) {
    console.error(err);
    alert('图片生成失败，请重试');
  } finally {
    saveButton.disabled = false;
    delete document.documentElement.dataset.busy;
  }
});

closeButton.addEventListener('click', closeLayer);
output.addEventListener('click', e => { if (e.target === output) closeLayer(); }); // 点背景关闭
