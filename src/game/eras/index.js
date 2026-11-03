import { smartPack } from './smart.js';
import { keypadPack, KEYPAD_BANNED, KEYPAD_PARTS, KEYPAD_PART_ORDER } from './keypad.js';
import { productEraOf, KEYPAD_FORMS } from './detect.js';
export * from './timeline.js';

export function packOf(designOrForm) {
  return productEraOf(designOrForm) === 'keypad' ? keypadPack : smartPack;
}

export function packByEra(era) {
  return era === 'keypad' ? keypadPack : smartPack;
}

export { smartPack, keypadPack, KEYPAD_BANNED, KEYPAD_PARTS, KEYPAD_PART_ORDER, productEraOf, KEYPAD_FORMS };
