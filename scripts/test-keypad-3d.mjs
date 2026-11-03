/** v0.11.1：功能机 / 老年机 3D 机身必须按 formFactor 分派且彼此可辨 */
import { readFileSync } from 'fs';
import { isKeypadForm } from '../src/studio/phone3d-keypad.js';

let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) console.log('✓', name);
  else {
    fails++;
    console.error('✗', name, detail);
  }
};

const phone3d = readFileSync(new URL('../src/studio/phone3d.js', import.meta.url), 'utf8');
const keypad = readFileSync(new URL('../src/studio/phone3d-keypad.js', import.meta.url), 'utf8');
const forms = readFileSync(new URL('../src/game/forms.js', import.meta.url), 'utf8');

ok('phone3d 读取 formFactor', /formFactor/.test(phone3d) && /isKeypadForm/.test(phone3d) && /buildKeypadPhone/.test(phone3d));
ok('feature|elder 走按键机身分派', /isKeypadForm\(ff\)/.test(phone3d) && /buildKeypadPhone\(design/.test(phone3d));
ok('feature 小屏+数字键盘', keypad.includes('keypadChassis') && keypad.includes("labels = ['1'") && keypad.includes('keypadGroup') && keypad.includes('standbyTexture'));
ok('feature 天线+听筒', keypad.includes('hasAntenna') && keypad.includes('grilleY'));
ok('elder SOS / 大键 / 手电筒', keypad.includes('SOS') && keypad.includes('hasSos') && keypad.includes('keyScale') && keypad.includes('flashlight'));
ok('elder 键帽更大', keypad.includes('elder ? 1.55') || /keyScale = elder \? 1\.55/.test(keypad));
ok('isKeypadForm 仅 feature/elder', isKeypadForm('feature') && isKeypadForm('elder') && !isKeypadForm('thick') && !isKeypadForm('bar') && !isKeypadForm('fold_s'));
ok('forms 仍设 formFactor', forms.includes('design.formFactor = f.id'));
ok('不强制 mutating keyboard 概念', !forms.includes("concepts.push('keyboard')") && !keypad.includes("concepts.push('keyboard')"));

console.log(fails ? `\nFAILED ${fails}` : '\nALL KEYPAD-3D CHECKS PASSED');
process.exit(fails ? 1 : 0);
