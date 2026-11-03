/**
 * 智能机时代包元数据（不引用 market.js，避免循环依赖）。
 * ideal / pointRules / posBasePrice / roundPrice 由消费方继续从 market.js 读取；
 * pack 侧提供定位/卖点/价位与销量系数。
 */
import { SLOTS, POSITIONING, SELL_POINTS, PRICE_BANDS } from '../data.js';

export const SMART_BANNED = /\b(双卡双待|64\s*和弦|待机\s*20\s*天|砸核桃)\b/;

export const smartPack = {
  id: 'smart',
  name: '智能机时代',
  parts: null,
  partOrder: null,
  positioning: POSITIONING,
  sellPoints: SELL_POINTS,
  priceBands: PRICE_BANDS,
  slots: SLOTS,
  ideal: null, // 见 market.IDEAL
  pointRules: null, // 见 market.POINT_RULES
  posBasePrice: null, // 见 market.POS_BASE_PRICE
  channelRate: 0.15,
  demandBase: 17,
  qualityExp: { flagship: 1.8, pro: 1.8, mainstream: 1.5, minimal: 1.1 },
  priceRange: { floor: 999, step: 100, ref: 3999 },
  recommendedPlan: { positioningId: 'mainstream', pointIds: ['fast', 'thin'], priceId: 'mid', bindEco: false },
  features: { cameraModule: true, screenForm: true, matSubs: true, chipLab: true, liveOS: 'smart' },
  concepts: null,
  conceptIds: null,
  bannedWords: SMART_BANNED,
  bom(costPts) {
    return Math.round(costPts * 70 + 250);
  },
  roundPrice: null,
  techRace: { kind: 'chip' },
  readoutsKind: 'bench',
  rivals: [
    { brand: '蓝莓科技', model: '蓝莓 15', price: 7999 },
    { brand: '方块数码', model: '方块 Ultra', price: 6999 },
    { brand: '极光移动', model: '极光 Note', price: 3999 },
    { brand: '青橙', model: '青橙 SE', price: 2499 },
  ],
};
