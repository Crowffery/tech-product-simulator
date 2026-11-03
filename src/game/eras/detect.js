/** 轻量时代判定（无重依赖，供 market/parts 打断循环引用） */
export const KEYPAD_FORMS = new Set(['feature', 'elder', 'flip', 'slider', 'swivel']);

export function productEraOf(designOrForm) {
  const id = typeof designOrForm === 'string' ? designOrForm : designOrForm?.formFactor;
  return KEYPAD_FORMS.has(id) ? 'keypad' : 'smart';
}
