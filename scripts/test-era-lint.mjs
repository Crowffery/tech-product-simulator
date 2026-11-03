/** v0.12：按键包可见文案不得命中现代词黑名单；EraPack 入口存在 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { KEYPAD_BANNED, keypadPack, packOf, productEraOf } from '../src/game/eras/index.js';
import { physical, tier, partOrderOf } from '../src/studio/parts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) console.log('✓', name);
  else {
    fails++;
    console.error('✗', name, detail);
  }
};

ok('productEraOf feature/elder=keypad', productEraOf('feature') === 'keypad' && productEraOf('elder') === 'keypad');
ok('productEraOf thick/bar=smart', productEraOf('thick') === 'smart' && productEraOf('bar') === 'smart');
ok('packOf feature 有按键价位', packOf('feature').priceBands.some((b) => b.price <= 299));
ok('packOf thick 仍是现代价', packOf('thick').priceBands.some((b) => b.price >= 1999));

const dFeat = {
  formFactor: 'feature',
  parts: { chip: 1, screen: 1, camera: 0, battery: 1, material: 0, size: 1, keyboard: 0, ringtone: 1, network: 0 },
  concepts: [],
  color: '#3a3d46',
};
const phys = physical(dFeat);
ok('feature BOM 落在 ¥150–600', phys.unitCost >= 150 && phys.unitCost <= 600, `unitCost=${phys.unitCost}`);
ok('feature 无跑分读数', !phys.bench || phys.bench === 0, `bench=${phys.bench}`);
ok('feature partOrder 含 keyboard/ringtone/network', partOrderOf(dFeat).includes('keyboard') && partOrderOf(dFeat).includes('network'));
ok('feature 芯片文案非跑分', !/跑分|Pro|Max/.test(tier(dFeat, 'chip').label + tier(dFeat, 'chip').note));

const dSmart = {
  formFactor: 'bar',
  parts: { chip: 1, screen: 1, camera: 1, battery: 1, material: 1, size: 1 },
  concepts: [],
  color: '#333',
  screenForm: 'punch',
  layout: 'island',
  chipGen: 1,
  chipSeries: '蜂鸟',
};
const ps = physical(dSmart);
ok('smart BOM 仍是千元级+', ps.unitCost > 1000, `unitCost=${ps.unitCost}`);

// 扫描按键包静态文案
const blobs = [];
blobs.push(JSON.stringify(keypadPack.positioning));
blobs.push(JSON.stringify(keypadPack.sellPoints));
blobs.push(JSON.stringify(keypadPack.priceBands));
blobs.push(JSON.stringify(keypadPack.parts));
blobs.push(JSON.stringify(keypadPack.rivals));
blobs.push(readFileSync(join(root, 'src/launch/keynote-keypad.js'), 'utf8'));
blobs.push(readFileSync(join(root, 'src/studio/featureOS.js'), 'utf8'));
const joined = blobs.join('\n');
const hit = joined.match(KEYPAD_BANNED);
ok('按键包黑名单 0 命中', !hit, hit ? hit[0] : '');

// phone3d present 不得对 keypad 使用现代 createLiveScreen 独占路径
const phone3d = readFileSync(join(root, 'src/studio/phone3d.js'), 'utf8');
ok('phone3d 按键走 createScreenFor/FeatureOS', phone3d.includes('createScreenFor') && phone3d.includes('isKeypadForm(ff)'));

// A5：企划含形态
const ui = readFileSync(join(root, 'src/ui.js'), 'utf8');
ok('企划形态前移 plan-form', ui.includes('plan-form') && ui.includes('formCardsHtml'));

ok('productEraOf flip=keypad', productEraOf('flip') === 'keypad');
const dFlip = { formFactor: 'flip', parts: { chip: 1, screen: 1, camera: 0, battery: 1, material: 0, size: 1, keyboard: 0, ringtone: 1, network: 0 }, concepts: [], color: '#444' };
ok('flip BOM 按键价', physical(dFlip).unitCost >= 150 && physical(dFlip).unitCost <= 700, `unitCost=${physical(dFlip).unitCost}`);
const kn = readFileSync(join(root, 'src/launch/keynote-keypad.js'), 'utf8');
ok('keynote 含砸核桃/营业厅', kn.includes('砸核桃') && kn.includes('营业厅'));
ok('films-keypad 注册', readFileSync(join(root, 'src/launch/films-keypad.js'), 'utf8').includes('kp_drop'));
ok('films.js 合入 KEYPAD_FILMS', readFileSync(join(root, 'src/launch/films.js'), 'utf8').includes('KEYPAD_FILMS'));
ok('bench 按键测试项', readFileSync(join(root, 'src/bench.js'), 'utf8').includes('KEYPAD_SUBS') && readFileSync(join(root, 'src/bench.js'), 'utf8').includes('跌落测试'));
ok('crowd 论坛/短信', readFileSync(join(root, 'src/launch/crowd.js'), 'utf8').includes('CM_KEYPAD') && readFileSync(join(root, 'src/launch/crowd.js'), 'utf8').includes('buildKeypadComments'));
ok('scenes/share 形态', readFileSync(join(root, 'src/scenes.js'), 'utf8').includes("ff === 'elder'") );

console.log(fails ? `\nFAILED ${fails}` : '\nALL ERA LINT PASSED');
process.exit(fails ? 1 : 0);
