/** 按键机外形选项（不依赖 three，设计台和 3D 共用） */
export const KP_SHAPES = {
  bar: [
    { id: 'pebble', label: '鹅卵石' },
    { id: 'waist', label: '沙漏腰身' },
    { id: 'candy', label: '圆润糖果' },
  ],
  elder: [
    { id: 'candy', label: '圆润糖果' },
    { id: 'pebble', label: '鹅卵石' },
  ],
  flip: [
    { id: 'clam', label: '圆顶蛤壳' },
    { id: 'slim', label: '超薄金属' },
  ],
  slider: [
    { id: 'candy', label: '圆润糖果' },
    { id: 'waist', label: '沙漏腰身' },
  ],
  swivel: [
    { id: 'candy', label: '圆润糖果' },
    { id: 'pebble', label: '鹅卵石' },
  ],
};

export function archetypeOf(design) {
  const ff = design?.formFactor || 'feature';
  if (ff === 'elder') return 'elder';
  if (ff === 'flip' || ff === 'slider' || ff === 'swivel') return ff;
  return 'bar';
}

/** 设计稿当前的轮廓（未选时按形态给默认） */
export function kpShapeOf(design) {
  const list = KP_SHAPES[archetypeOf(design)] || KP_SHAPES.bar;
  return list.some((s) => s.id === design?.kpShape) ? design.kpShape : list[0].id;
}
