/**
 * 像素风 SVG 图标（16×16 网格），替代 emoji，在所有平台上长得一样。
 * 每个图标用字符画定义：字符 → 颜色。
 */
const PAL = {
  k: '#2f2117', // 描边
  y: '#f5b041', // 金
  Y: '#fcd96a', // 亮金
  o: '#b9770e', // 暗金
  r: '#e74c3c',
  R: '#f1948a',
  d: '#922b21',
  s: '#f9e79f',
  b: '#5dade2',
  B: '#aed6f1',
  n: '#1f618d',
  g: '#2ecc71',
  G: '#abebc6',
  w: '#ffffff',
  p: '#8e44ad',
  P: '#d7bde2',
  m: '#7f8c8d',
};

const ART = {
  coin: [
    '................',
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyYYYYYYyyk..',
    '..kyYYyyyyYYyk..',
    '.kyYYyykkyyYYyk.',
    '.kyYyykyykyyYyk.',
    '.kyYyyyykyyyYyk.',
    '.kyYyyykyyyyYyk.',
    '.kyYyykyyyyyYyk.',
    '.kyYYyykkkyYYyk.',
    '..kyYYyyyyYYyk..',
    '..koyYYYYYYyok..',
    '...kkooooookk...',
    '.....kkkkkk.....',
    '................',
  ],
  heart: [
    '................',
    '................',
    '..kkkk....kkkk..',
    '.kRRrrk..kRrrrk.',
    'kRwRrrrkkrrrrrrk',
    'kRRrrrrrrrrrrrrk',
    'krrrrrrrrrrrrrrk',
    'krrrrrrrrrrrrrdk',
    '.krrrrrrrrrrrdk.',
    '..krrrrrrrrrdk..',
    '...krrrrrrrdk...',
    '....krrrrrdk....',
    '.....krrrdk.....',
    '......krdk......',
    '.......kk.......',
    '................',
  ],
  star: [
    '.......kk.......',
    '......kYYk......',
    '......kYyk......',
    '.....kYyyyk.....',
    'kkkkkkYyyyykkkkk',
    'kYYYYYyyyyyyyyok',
    '.kyYyyyyyyyyyok.',
    '..kyyyyyyyyyok..',
    '...kyyyyyyyok...',
    '...kyyyyyyyyk...',
    '..kyyyyokyyyyk..',
    '..kyyyok.koyyk..',
    '.kyyok....koyyk.',
    '.kyok......koyk.',
    '.kkk........kkk.',
    '................',
  ],
  flask: [
    '................',
    '.....kkkkkk.....',
    '.....kBwwBk.....',
    '......kBBk......',
    '......kBBk......',
    '......kBBk......',
    '.....kBBBBk.....',
    '....kBBBBBBk....',
    '...kBBBBBBBBk...',
    '..kggggggggggk..',
    '..kgGgggggGggk..',
    '.kggggGgggggggk.',
    '.kgggggggGgggGk.',
    '.kggggggggggggk.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  note: [
    '................',
    '.........kkkkk..',
    '......kkkpppPk..',
    '......kppPPpPk..',
    '......kpkkkkpk..',
    '......kpk...kpk.',
    '......kpk...kpk.',
    '......kpk...kpk.',
    '......kpk...kpk.',
    '..kkkkkpk.kkkpk.',
    '.kppppppkkppppk.',
    '.kpPppppkkpPppk.',
    '.kppppppk.kpppk.',
    '..kkkkkk...kkk..',
    '................',
    '................',
  ],
  speaker: [
    '................',
    '.......kk.......',
    '......kmk...k...',
    '.....kmmk....k..',
    'kkkkkmmmk..k..k.',
    'kwwwkmmmk...k.k.',
    'kwmmmmmmk.k.k.k.',
    'kwmmmmmmk.k.k.k.',
    'kwmmmmmmk.k.k.k.',
    'kwwwkmmmk...k.k.',
    'kkkkkmmmk..k..k.',
    '.....kmmk....k..',
    '......kmk...k...',
    '.......kk.......',
    '................',
    '................',
  ],
  mute: [
    '................',
    '.......kk.......',
    '......kmk.......',
    '.....kmmk.......',
    'kkkkkmmmk.r...r.',
    'kwwwkmmmk..r.r..',
    'kwmmmmmmk...r...',
    'kwmmmmmmk..r.r..',
    'kwmmmmmmk.r...r.',
    'kwwwkmmmk.......',
    'kkkkkmmmk.......',
    '.....kmmk.......',
    '......kmk.......',
    '.......kk.......',
    '................',
    '................',
  ],
  restart: [
    '................',
    '.....kkkkk......',
    '...kkbbbbbkk.k..',
    '..kbbkkkkkbbkbk.',
    '.kbbk.....kbbbk.',
    '.kbk......kbbbk.',
    'kbbk.....kkkkkk.',
    'kbk.............',
    'kbk.............',
    'kbbk.........k..',
    '.kbk........kbk.',
    '.kbbk......kbbk.',
    '..kbbkkkkkkbbk..',
    '...kkbbbbbbkk...',
    '.....kkkkkk.....',
    '................',
  ],
};

const cache = {};
/** 返回内联 SVG 字符串 */
export function icon(name, size = 18, cls = '') {
  const key = `${name}|${size}|${cls}`;
  if (cache[key]) return cache[key];
  const art = ART[name];
  if (!art) return '';
  let rects = '';
  art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = PAL[row[x]];
      if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
    }
  });
  cache[key] = `<svg class="pxi ${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  return cache[key];
}
