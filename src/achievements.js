// 成就：全部由当前标记数据推算，不单独存档（导入备份、多标签页同步后自动一致）。
// 每个成就：id、类别、名称、说明、稀有度（bronze / silver / gold / legend）、卡面文字、目标值、进度函数；
// secret 为隐藏成就，解锁前不显示名称和说明
import { units, provinces } from './map.js';

export const TIERS = {
  bronze: '铜',
  silver: '银',
  gold: '金',
  legend: '传说',
};

export const CATEGORIES = [
  { id: 'count', name: '足迹' },
  { id: 'province', name: '省份' },
  { id: 'level', name: '等级' },
  { id: 'geo', name: '地理' },
  { id: 'score', name: '分数' },
];

// 省会（不含直辖市、港澳台）
const CAPITALS = [
  '130100', '140100', '150100', '210100', '220100', '230100', '320100', '330100', '340100', '350100',
  '360100', '370100', '410100', '420100', '430100', '440100', '450100', '460100', '510100', '520100',
  '530100', '540100', '610100', '620100', '630100', '640100', '650100',
];
const MUNICIPALITIES = ['110000', '120000', '310000', '500000'];
const HMT = ['810000', '820000', '710000'];
// 四极：东（佳木斯·抚远）、西（克孜勒苏·乌恰）、南（三沙）、北（大兴安岭·漠河）
const EXTREMES = ['230800', '653000', '460300', '232700'];
const JIANGNAN = ['310000', '320100', '320200', '320400', '320500', '330100', '330200', '330400', '330500', '330600'];
// 行政大区：省级代码首位（港澳台为 7、8）
const REGIONS = ['1', '2', '3', '4', '5', '6', '78'];
const NORTHWEST = ['610000', '620000', '630000', '640000', '650000'];
const NORTHEAST = ['210000', '220000', '230000'];

const count = codes => ctx => codes.filter(c => ctx.lv[c]).length;
const provincesLit = codes => ctx => codes.filter(p => ctx.litProvinces.has(p)).length;

const DEFS = [
  // 足迹：去过的城市数
  { id: 'c1', cat: 'count', tier: 'bronze', glyph: '1', name: '迈出第一步', desc: '点亮第一座城市', goal: 1, of: c => c.visited },
  { id: 'c10', cat: 'count', tier: 'bronze', glyph: '10', name: '小有足迹', desc: '去过 10 座城市', goal: 10, of: c => c.visited },
  { id: 'c30', cat: 'count', tier: 'silver', glyph: '30', name: '走南闯北', desc: '去过 30 座城市', goal: 30, of: c => c.visited },
  { id: 'c50', cat: 'count', tier: 'silver', glyph: '50', name: '见多识广', desc: '去过 50 座城市', goal: 50, of: c => c.visited },
  { id: 'c100', cat: 'count', tier: 'gold', glyph: '100', name: '百城之旅', desc: '去过 100 座城市', goal: 100, of: c => c.visited },
  { id: 'c200', cat: 'count', tier: 'gold', glyph: '200', name: '行万里路', desc: '去过 200 座城市', goal: 200, of: c => c.visited },
  { id: 'c300', cat: 'count', tier: 'gold', glyph: '300', name: '城市收藏家', desc: '去过 300 座城市', goal: 300, of: c => c.visited },
  { id: 'c370', cat: 'count', tier: 'legend', glyph: '370', name: '全国制霸', desc: '去过全部 370 座城市', goal: 370, of: c => c.visited },

  // 省份
  { id: 'p10', cat: 'province', tier: 'bronze', glyph: '省', name: '跨省旅行', desc: '在 10 个省级行政区留下足迹', goal: 10, of: c => c.litProvinces.size },
  { id: 'p20', cat: 'province', tier: 'silver', glyph: '省', name: '半壁江山', desc: '在 20 个省级行政区留下足迹', goal: 20, of: c => c.litProvinces.size },
  { id: 'p34', cat: 'province', tier: 'gold', glyph: '34', name: '神州漫游', desc: '在全部 34 个省级行政区留下足迹', goal: 34, of: c => c.litProvinces.size },
  { id: 'f1', cat: 'province', tier: 'silver', glyph: '霸', name: '一省制霸', desc: '点亮一个省的全部城市', goal: 1, of: c => c.fullProvinces },
  { id: 'f5', cat: 'province', tier: 'gold', glyph: '霸', name: '五省制霸', desc: '点亮五个省的全部城市', goal: 5, of: c => c.fullProvinces },
  { id: 'f10', cat: 'province', tier: 'legend', glyph: '霸', name: '十省制霸', desc: '点亮十个省的全部城市', goal: 10, of: c => c.fullProvinces },

  // 等级
  { id: 'l5a', cat: 'level', tier: 'bronze', glyph: '居', name: '安家落户', desc: '有一座标记为"居住"的城市', goal: 1, of: c => c.counts[5] },
  { id: 'l5b', cat: 'level', tier: 'silver', glyph: '居', name: '四海为家', desc: '在 3 座城市居住过', goal: 3, of: c => c.counts[5] },
  { id: 'l4', cat: 'level', tier: 'silver', glyph: '短', name: '候鸟', desc: '在 5 座城市短居过', goal: 5, of: c => c.counts[4] },
  { id: 'l3a', cat: 'level', tier: 'silver', glyph: '游', name: '旅行家', desc: '游玩过 30 座城市', goal: 30, of: c => c.counts[3] },
  { id: 'l3b', cat: 'level', tier: 'gold', glyph: '游', name: '职业游客', desc: '游玩过 100 座城市', goal: 100, of: c => c.counts[3] },
  { id: 'l2', cat: 'level', tier: 'silver', glyph: '差', name: '空中飞人', desc: '出差去过 20 座城市', goal: 20, of: c => c.counts[2] },
  { id: 'l1', cat: 'level', tier: 'silver', glyph: '过', name: '匆匆过客', desc: '路过 30 座城市', goal: 30, of: c => c.counts[1] },

  // 地理
  { id: 'g-muni', cat: 'geo', tier: 'silver', glyph: '京', name: '直辖市巡礼', desc: '去过北京、天津、上海、重庆', goal: 4, of: count(MUNICIPALITIES) },
  { id: 'g-hmt', cat: 'geo', tier: 'gold', glyph: '港', name: '港澳台之旅', desc: '去过香港、澳门、台湾', goal: 3, of: count(HMT) },
  { id: 'g-cap10', cat: 'geo', tier: 'bronze', glyph: '会', name: '省会打卡', desc: '去过 10 个省会城市', goal: 10, of: count(CAPITALS) },
  { id: 'g-cap', cat: 'geo', tier: 'gold', glyph: '会', name: '省会全收集', desc: '去过全部 27 个省会城市', goal: 27, of: count(CAPITALS) },
  { id: 'g-ext', cat: 'geo', tier: 'gold', glyph: '极', name: '东西南北', desc: '去过四极所在的城市：佳木斯、克孜勒苏、三沙、大兴安岭', goal: 4, of: count(EXTREMES) },
  { id: 'g-region', cat: 'geo', tier: 'silver', glyph: '区', name: '大区巡游', desc: '华北、东北、华东、中南、西南、西北、港澳台各去过至少一座城市', goal: REGIONS.length,
    of: c => REGIONS.filter(r => [...c.litProvinces].some(p => r.includes(p[0]))).length },
  { id: 'g-nw', cat: 'geo', tier: 'silver', glyph: '丝', name: '丝绸之路', desc: '西北五省区（陕、甘、宁、青、新）都留下足迹', goal: 5, of: provincesLit(NORTHWEST) },
  { id: 'g-ne', cat: 'geo', tier: 'bronze', glyph: '关', name: '闯关东', desc: '东北三省（辽、吉、黑）都留下足迹', goal: 3, of: provincesLit(NORTHEAST) },
  { id: 'g-jn', cat: 'geo', tier: 'silver', glyph: '江南', name: '烟雨江南', desc: '去过上海、南京、苏州、无锡、常州、杭州、宁波、嘉兴、湖州、绍兴', goal: 10, of: count(JIANGNAN) },

  // 分数
  { id: 's100', cat: 'score', tier: 'bronze', glyph: '100', name: '百分选手', desc: '总分达到 100 分', goal: 100, of: c => c.score },
  { id: 's500', cat: 'score', tier: 'silver', glyph: '500', name: '高分玩家', desc: '总分达到 500 分', goal: 500, of: c => c.score },
  { id: 's1000', cat: 'score', tier: 'gold', glyph: '1000', name: '千分大师', desc: '总分达到 1000 分', goal: 1000, of: c => c.score },
  { id: 's1850', cat: 'score', tier: 'legend', glyph: '1850', name: '先活个 370 岁', desc: '拿到满分 1850 分：每座城市都住满一年以上', goal: 1850, of: c => c.score, secret: true },
];

// 推算所需的汇总数据
const contextOf = lv => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const litProvinces = new Set();
  const perProvince = new Map();
  let score = 0, visited = 0;
  for (const u of units) {
    const l = lv[u.code] ?? 0;
    const p = perProvince.get(u.province) ?? { total: 0, lit: 0 };
    p.total++;
    if (l) {
      counts[l]++;
      score += l;
      visited++;
      p.lit++;
      litProvinces.add(u.province);
    }
    perProvince.set(u.province, p);
  }
  // 全制霸只算有多座城市的省（直辖市、港澳台去过一次就算"全部"，不计入）
  const fullProvinces = provinces.filter(p => !p.single && perProvince.get(p.code)?.lit === perProvince.get(p.code)?.total).length;
  return { lv, counts, score, visited, litProvinces, fullProvinces };
};

// 每个成就的当前进度：{ ...定义, value（封顶到 goal）, done }
export const evaluate = levels => {
  const ctx = contextOf(levels);
  return DEFS.map(d => {
    const value = Math.min(d.goal, d.of(ctx));
    return { ...d, value, done: value >= d.goal };
  });
};

export const unlockedIds = levels => new Set(evaluate(levels).filter(a => a.done).map(a => a.id));
