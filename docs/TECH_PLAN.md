# 《电子产品发展国》v0.12 – v0.16 技术开发文档

> 配套产品文档：[`docs/ERA_PLAN.md`](ERA_PLAN.md)（问题编号 A1–M3、版本目标与验收标准以它为准）。
> 基线：`main` @ `1e9c602`。本文写清每个版本**改哪些文件、新增哪些模块、数据结构长什么样、关键函数怎么实现、怎么测**。

---

## 目录

1. 现有架构（基线）
2. 总体技术方案：时代内容包
3. 数据结构定义（EraPack）
4. v0.12 实现：底座 + 按键机切片
5. v0.13 实现：老年机 / 翻盖 / 滑盖 / 场景
6. v0.14 实现：发布会、舆论、测试
7. v0.15 实现：编年史、革命、制式、事件
8. v0.16 实现：打磨与性能
9. 测试与工具
10. 存档迁移
11. 性能预算
12. 风险与对策
13. 自审记录

---

## 1. 现有架构（基线 `main@1e9c602`）

| 模块 | 行数 | 职责 | 与本次改造相关的入口 |
|---|---|---|---|
| `src/ui.js` | 2411 | 全部界面：HUD、各阶段面板（`P.plan / P.supply / …`）、事件分发 `onClick`、发布会播放 `playReveal` | `P.plan`、定价台 `pricingPanel`、`hud()`、发布会定制、评论区、芯片实验室 |
| `src/game/state.js` | 135 | 新游戏 / 存档读写，`version: 2` | 迁移 |
| `src/game/data.js` | 426 | 静态表：`SLOTS / DEPTS / POSITIONING / SELL_POINTS / PRICE_BANDS / SUPPLIERS / EVENTS / MARKET_EVENTS / EXPANSIONS / RIVAL_SHARE` | 大部分要变成「按包取」 |
| `src/game/logic.js` | 1285 | 主循环：企划、设计、研发、事件、生命周期、定价、评分、销售、年终 | `finishPlan`、`experienceScore`、`demandUnits`、`unitMargin`、`chipLag`、`COMMENTS`、`LAUNCH_OPT_FIELDS` |
| `src/game/market.js` | 193 | 理想配比、卖点规则、档期、竞品、价格工具 | `IDEAL`、`POINT_RULES`、`priceFit`、`POS_BASE_PRICE`、`roundPrice`、`marketSize`、`rivalPriceList`、`marketChipGen` |
| `src/game/forms.js` | 233 | v0.11 形态时间轴 | `FORM_ERAS`、`FORM_FACTORS`、`formOf` |
| `src/game/finance.js` | 190 | 贷款 / 过桥 | 不改（文案按时代） |
| `src/game/angels.js` | 322 | 天使奇遇卡组 | 加时代标签过滤 |
| `src/studio/parts.js` | 717 | 部件档位、概念件、`physical()`、`slotCaps()`、新颖度、弹幕旧版 | `PARTS`、`CONCEPTS`、`physical`、`slotCaps`、`marketNews`、`COMBOS` |
| `src/studio/studio.js` | 1077 | 设计台 UI（配置 / 创新 / 外观 / 评估） | 形态选择器、`configTab`、`appearanceTab`、`innovationTab`、`readouts`、`chipChart` |
| `src/studio/phone3d.js` | 2711 | 3D 机身构建 `buildPhone()` + 舞台 `PhoneStage` | `buildPhone(design, { liveScreen })`、`PhoneStage.setDesign` |
| `src/studio/screenOS.js` | 1180 | 手机屏幕实时渲染 `createLiveScreen()`，发布会屏显模式 | 工厂化，新增按键机屏幕 |
| `src/launch/keynote.js` | 980 | 发布会节目单 `buildKeynote(ctx)` → 段落数组（`screen / pose / wall / kpi / sub / react`） | 按包分派 |
| `src/launch/crowd.js` | 189 | 弹幕 `danmakuLines`、评论 `buildComments` | 池子迁入包 |
| `src/bench.js` | 314 | 工程机跑分 `openBench(opts)` | 测试项由包提供 |
| `src/scenes.js` | 1066 | 像素场景 `SceneView`，`phone()` 画手机 | 按机型原型画 |
| `src/studio/music.js` / `sfx.js` | 411 / 477 | 生成式音乐、音效 | 时代配器 |
| `src/share.js`、`src/glossary.js`、`src/icons.js` | — | 分享卡、术语、像素图标 | 时代文案 |
| `scripts/test-v011.mjs`、`test-tail-sales.mjs` | — | Node 自测 | 新增时代测试 |

**当前数据流（简化）**：
`ui.P.plan → logic.finishPlan(plan)` → 设计台 `studio`（选形态、部件、概念件）→ `logic.confirmDesign` → 供应链 → 研发 `advanceMonth` → 量产 → 定价 `setPrice` → `resolveLaunchStyle` → `playReveal`（`buildKeynote` + `PhoneStage` + `screenOS`）→ `runSales` → `enterNext`。

**问题根源**：内容表散落 7 个文件，消费方直接 `import { PARTS, SLOTS, … }`，没有「这台机属于哪个时代」的入口（M2）。

---

## 2. 总体技术方案：时代内容包

### 2.1 核心抽象

```
src/game/eras/
  index.js     // 包注册、选择器：packOf / productEraOf / worldEraOf / timelineOf
  smart.js     // 智能包：把现有表原样搬入（行为零变化）
  keypad.js    // 按键包：按键时代全部数据与规则
  types.js     // JSDoc 类型定义（EraPack）
```

- **产品时代**：`productEraOf(design)` —— 由 `design.formFactor` 决定：`feature / elder / flip / slider / swivel → 'keypad'`，其余 → `'smart'`。
- **世界时代**：`worldEraOf(state)` —— 由 `state.mode` 与 `state.month` 查时间轴（v0.15 之前只有一张时间轴）。
- **包**：`packOf(designOrForm)` 返回对应的 `EraPack` 对象。
- **规则**：凡是「给玩家看的内容」或「随时代不同的规则」，消费方一律通过 `packOf(...)` 或 `worldPack(state)` 取，**禁止直接 import 现代表**（加 ESLint 风格的 grep 检查，见 §9.4）。

### 2.2 保持内部 id 稳定，只换「语义层」

为把对逻辑层的冲击降到最小：
- **研发槽 id 不变**（`perf / design / camera / battery / os`），按键包只换显示名与评语（流畅度 / 外观与屏幕 / 拍照 / 待机与耐用 / 铃声与功能）。所有现有公式（`matchOf`、`devRatio`、`balancedAllocation`）无需改动。
- **部件 key 基本不变**（`chip / screen / camera / battery / material / size`），按键包提供自己的 tiers；新增 `keyboard / ringtone / network` 三个 key，仅按键包的 `partOrder` 包含它们。
- **定位、卖点 id 按包独立**（按键包用 `elderly / student / business / fashion`、`standby / bigtext / rugged / ringtone / camphone / dualsim / value`），各自携带 `IDEAL` 与规则函数。

### 2.3 屏幕、3D、发布会的「多态」

| 层 | 统一接口 | 智能包实现 | 按键包实现 |
|---|---|---|---|
| 手机屏幕 | `{ texture, canvas, mode, setScreenMode(m, opts), paint(now), setTheme, dispose }` | `createLiveScreen`（现有） | `createFeatureScreen`（新 `featureOS.js`） |
| 3D 机身 | `buildPhone(design, opts) → { root, layers, anchors, anim, ctl, dims, screen }` | 现有 `buildPhone` | `buildKeypadPhone`（新 `phone3d-keypad.js`） |
| 节目单 | `buildKeynote(ctx) → Segment[]` | 现有 | `buildKeypadKeynote`（新 `keynote-keypad.js`） |
| 产品短片 | `FILMS[name](g, W, H, t, data)` | 合入 `films.js` | 新 `films-keypad.js` |
| 测试 | `tests: [{ id, name, w, draw(g,t) }]` | 现有 `SUBS + DRAW` | 新测试项 |

分派点只有一处：`screenFor(design)`、`buildPhoneFor(design)`、`packOf(d).buildKeynote(ctx)`。

---

## 3. 数据结构定义（EraPack）

```js
/**
 * @typedef {Object} EraPack
 * @property {'keypad'|'smart'} id
 * @property {string} name                       // 「按键时代」/「智能机时代」
 * @property {string} badgeColor                 // HUD 徽章色
 *
 * // —— 设计与研发 ——
 * @property {string[]} partOrder                // 配置台部件顺序
 * @property {Object<string, PartDef>} parts     // 每个部件的 tiers（与现有 PARTS 结构一致）
 * @property {Object<string, {name:string, blurb:string, comments:string[]}>} slots  // 研发槽显示名 + 进度评语
 * @property {(costPts:number, design)=>number} bom          // 单台成本（元）
 * @property {(design)=>{label:string, value:string}[]} readouts // 读数条（按键：厚度/重量/待机/成本）
 * @property {{cameraModule:boolean, screenForm:boolean, matSubs:boolean}} features // 设计台开关
 * @property {LookOption[]} lookOptions           // 外观页选项（按键：键盘背光/开机画面/待机图/挂绳/贴纸）
 * @property {string[]} conceptIds                // 本包可出现的概念件 id
 * @property {string[]} practicalIds              // 不占名额的实用功能
 * @property {Combo[]} combos                     // 品类组合
 *
 * // —— 企划与市场 ——
 * @property {Positioning[]} positioning          // { id, name, who, desc, exp, cost, months, ideal:{perf,design,camera,battery,os} }
 * @property {SellPoint[]} sellPoints             // { id, name, desc, rule:(state, phys)=>boolean, requires?:(design)=>boolean }
 * @property {{id:string,name:string,price:number}[]} priceBands
 * @property {Object<string, number>} basePrice   // 定位 → 心理价位基准
 * @property {{floor:number, ceil:number, step:number, ref:number}} priceRange // 定价滑杆与 marketSize 参考价
 * @property {number} channelRate                 // 渠道费率
 * @property {number} demandBase                  // 需求基数（按键更大）
 * @property {Object<string, number>} qualityExp  // 定位 → 品质敏感度
 * @property {(month:number)=>RivalModel[]} rivals          // 定价台同档竞品
 * @property {(month:number)=>{n:string,v:number}[]} testRivals // 测试 / 跑分榜竞品
 * @property {TechRace} techRace                  // { kind:'chip'|'network', label, levels, worldLevelAt(month), lagEffect }
 *
 * // —— 演出与舆论 ——
 * @property {'touch'|'keypad'} screenKind
 * @property {(ctx)=>Segment[]} buildKeynote
 * @property {Object} launchOpts                  // 发布会定制字段（开场白 / 灯光 / 屏显 / 运镜）
 * @property {CrowdPack} crowd                    // { danmaku:{intent:string[]}, comments:{intent:{base,hot,t[]}}, names[], avatars[], style:'feed'|'bbs', liveStyle:'danmaku'|'smswall' }
 * @property {TestDef[]} tests                    // 工程机测试 / 跑分子项
 * @property {Object<string,string[]>} headlines  // 媒体标题按情形
 *
 * // —— 世界（由世界时代使用） ——
 * @property {string[]} eventTags                 // 事件池标签
 * @property {Object<string,string>} tutorial     // 引导文案
 * @property {string[]} glossary                  // 可见术语
 * @property {EndingTitle[]} endings
 * @property {{flavor:'chip'|'modern'}} music
 * @property {RegExp} bannedWords                 // 本包禁止出现的词（黑名单测试用）
 */
```

**按键包 `bannedWords` 初版**：
`/跑分|全面屏|高刷|\d+Hz|夜景|大底|三摄|快充|\d+W|AI|人工智能|5G|钛|折叠|铰链|遥遥领先|Are you OK|Only .* can do|挖孔|屏下|潜望|一英寸|NPU|GPU|App|应用商店|直播|带货|主播|国补|外购芯片|流片|联芯|蓝莓 1\d|方块 \d+ Pro|弹幕/`
（逐版本扩充；智能包也有自己的黑名单，用于防止按键专属词泄漏，如「待机 20 天」「64 和弦」只允许在老年机 / 按键机评论出现。）

---

## 4. v0.12 实现：底座 + 按键机切片

### 4.1 任务分解（按提交顺序）

| # | 任务 | 文件 | 说明 |
|---|---|---|---|
| 1 | 合入 polish 分支短片 | `src/launch/films.js`、`ui.js` 播放逻辑 | 与 `main` 的屏显（`screen` 字段）并存：段落可同时有 `film`（全屏）与 `screen`（切回舞台时手机屏幕的模式）；冲突处以 `main` 的 `playReveal` 结构为准，把 `film` 阶段插在每段开头 |
| 2 | 建立 `eras/` 与 `smart.js` | 新 `src/game/eras/*` | 把 `PARTS / SLOTS / POSITIONING / SELL_POINTS / POINT_RULES / IDEAL / PRICE_BANDS / POS_BASE_PRICE / rivals / COMMENTS / LAUNCH_OPT_FIELDS / crowd 池 / bench 子项 / headlines` **原样**引用进 `smart` 包（不复制数据，`import` 后组装），保证零行为变化 |
| 3 | 消费方改走 `packOf` | `parts.js`、`logic.js`、`market.js`、`studio.js`、`ui.js`、`crowd.js`、`bench.js`、`keynote.js` | 见 4.2 逐函数改造表 |
| 4 | 回归验证 | `scripts/` | 现有两个测试 + 现代线截图比对（§9.3）必须全绿后再继续 |
| 5 | `keypad.js` 第一批数据 | 新 | ERA_PLAN 5.4.1–5.4.9 全部表格落为数据 |
| 6 | 企划形态前移 | `ui.js P.plan`、`logic.finishPlan` | 4.3 |
| 7 | 按键 3D 直板 | 新 `src/studio/phone3d-keypad.js`，`phone3d.js` 分派 | 4.4 |
| 8 | FeatureOS 基础模式 | 新 `src/studio/featureOS.js` | 4.5 |
| 9 | 过渡节目单 | 新 `src/launch/keynote-keypad.js`（v0.14 扩写） | 4.6 |
| 10 | 制式竞赛（基础） | `logic.js` `techLag` | 4.7 |
| 11 | 防漏工具 | 新 `scripts/test-era-lint.mjs`、`scripts/audit-era.cjs` | §9 |
| 12 | 存档迁移 v3 | `state.js` | §10 |

### 4.2 逐函数改造表

| 位置 | 现状 | 改造 |
|---|---|---|
| `parts.js tier(design, key)` | `PARTS[key].tiers[design.parts[key]]` | `packOf(design).parts[key].tiers[...]`，越界回落档 1 |
| `parts.js PART_ORDER` | 常量 | `partOrderOf(design) = packOf(design).partOrder` |
| `parts.js physical()` | `(costPts)*70+250` × 形态系数 | `pack.bom(costPts, design)`；按键包：`costPts*15+60`；厚度 / 重量公式保留，按键包部件自带 `thick / weight` |
| `parts.js slotCaps()` | 固定读 chip/screen/camera/battery | 改为遍历 `pack.partOrder`，每个 tier 带 `caps:{slotId:+n}`（统一数据驱动，现代包把现有逻辑翻译成同样结构，单测保证数值不变） |
| `parts.js chipSpec()` / `chipName()` | 现代芯片 | 仅智能包使用；按键包对应 `basebandSpec()`（名字如「蜂鸟 B1 基带」，无跑分） |
| `parts.js marketNews()` | 现代概念件扎堆 | 读 `worldPack(state).newsPool` + 概念件记忆（只统计同包概念件） |
| `parts.js hasAppeared(id, ctx)` | gen/month 规则 | 增加 `ctx.pack`：不在 `pack.conceptIds` 的直接 false |
| `logic.js finishPlan(state, plan)` | 不含形态 | `plan.formFactor` 必填；`state.product.era = productEraOf(...)`；定位 / 卖点在包内校验 |
| `logic.js experienceScore` | `POSITIONING.find` | `packOf(state.design).positioning.find` |
| `logic.js demandUnits` | `26 * demand`、`qe` 表、`marketSize(price)` 参考 3999 | `pack.demandBase`、`pack.qualityExp`、`marketSize(price, pack.priceRange.ref)` |
| `logic.js unitMargin` | 渠道 15% | `pack.channelRate` |
| `logic.js COMMENTS / commentFor` | 现代评语 | `pack.slots[slotId].comments` |
| `logic.js chipLag` | `marketChipGen(month) - design.chipGen` | 通用 `techLag(state, design)`：`pack.techRace.worldLevelAt(month) - designLevel`；按键包 designLevel = 制式档位 |
| `logic.js LAUNCH_OPT_FIELDS / defaultLaunchOpts` | 现代开场白 | `pack.launchOpts` |
| `market.js POINT_RULES / promiseCheck` | 现代规则 | `pack.sellPoints[].rule` |
| `market.js priceFit / POS_BASE_PRICE / roundPrice / rivalPriceList` | 现代价格 | 全部接收 `pack` 参数；`roundPrice(v, pack)` 用 `pack.priceRange.floor` 与 `step`（按键 ¥10 步进、尾数 9） |
| `market.js rivalPhones` | 现代跑分榜 | `pack.testRivals(month)` |
| `studio.js configTab` | 固定部件 + 镜头模组 + 前摄开孔 | 遍历 `pack.partOrder`；`pack.features.cameraModule / screenForm / matSubs` 控制显示 |
| `studio.js appearanceTab` | 现代外观项 | 公共项（圆角 / 主色 / 拼色 / 机型名）+ `pack.lookOptions` |
| `studio.js readouts / chipChart` | 跑分 | `pack.readouts(design)`；按键包「待机 N 天」；`chipChart` 改为 `techChart`（按键：制式对比） |
| `ui.js P.plan` | 定位 → 卖点 → 价位带 | 形态卡片 → 定位 → 卖点 → 价位带（4.3） |
| `ui.js pricingPanel` | 现代价格 | `pack.priceRange`、`pack.rivals` |
| `ui.js chipLab / chipSourcePick` | 芯片 | `pack.techRace.kind === 'network'` 时渲染「通信实验室 / 基带平台」 |
| `crowd.js` | 模块内常量 | `danmakuLines(design, ctx)` 内 `const C = packOf(design).crowd` |
| `bench.js openBench` | 内部 `SUBS / DRAW` | `opts.tests` 由调用方传入 `pack.tests` |
| `keynote.js buildKeynote` | 唯一实现 | 重命名为 `buildSmartKeynote`；新 `buildKeynote(ctx) = packOf(ctx.d).buildKeynote(ctx)` |

### 4.3 企划形态前移

- `ui.js P.plan` 顶部渲染 `formCards(state.month)`：复用 `forms.js formTimeline()` 与设计台形态选择器的样式（抽成 `src/ui/formCards.js` 小组件，设计台与企划共用）。
- `draft.plan.formFactor` 默认 `defaultFormId(month)`；切换形态时：`draft.plan.positioningId / pointIds / priceId` 重置为该包的推荐值（`pack.recommendedPlan`），并触发一次面板淡入动画（CSS `.plan-swap`）。
- `finishPlan` 把形态写进 `designDraft.formFactor`；设计台的形态选择器保留，但只允许在**同一产品时代内**切换（例如功能机 ↔ 老年机），跨时代切换需回到企划（提示「要换成智能机，请回到企划重新定位」），以免定位 / 卖点失配。

### 4.4 按键 3D（`phone3d-keypad.js`）

**导出**：`buildKeypadPhone(design, { liveScreen, hdScreen }) → { root, layers, anchors, anim, ctl, dims, screen }`（与现有 `buildPhone` 返回结构一致，`PhoneStage` 无需感知差异）。

**分派**：`phone3d.js` 中 `buildPhone()` 开头：

```js
if (productEraOf(design) === 'keypad') return buildKeypadPhone(design, opts);
```

**几何构成（直板，v0.12）**：
| 部件 | 实现 |
|---|---|
| 机身 | `ExtrudeGeometry(roundedRectShape(w, h, r))`，`bevelEnabled` 小倒角；材质沿用 `bodyMaterial`（塑料 / 烤漆 = 玻璃参数降 clearcoat / 金属拉丝 = 金属 + 拉丝法线贴图 canvas） |
| 屏幕 | 机身上部 `PlaneGeometry(sw, sh)`，sw≈0.75w、sh≈0.38h；贴图 = `liveScreen.texture`（FeatureOS）；外圈黑色边框 plane |
| 听筒格栅 | 屏幕上方 `ShapeGeometry` 胶囊 + 竖条 canvas 贴图 |
| 方向键 / 功能键 | 圆角方块 + 中心圆键（`CylinderGeometry`），左右软键、绿色通话 / 红色挂断（颜色来自材质 + 小色块） |
| 数字键盘 | **一份**圆角键帽几何（`ExtrudeGeometry` 小倒角）+ `InstancedMesh(12)`；键面文字使用一张 canvas 图集（`1 2abc 3def … * 0 #`），每个实例用 `instanceMatrix` 定位，文字通过**每键一个小 Plane + 图集 UV 偏移**实现（12 个 plane，共享材质与纹理，几何 UV 按键位生成） |
| 键盘背光 | 键帽材质 `emissive` = 外观选项颜色，强度随 `anim` 呼吸；跑马灯选项时按索引相位轮流点亮 |
| 天线（可选） | `CylinderGeometry` 短桩 + 拉杆（多段圆柱），概念件「拉杆天线」时伸出动画 |
| 背面 | 电池盖接缝（`Line`）、小镜头（摄像头档 ≥1 时一颗 `CylinderGeometry` + 玻璃）、喇叭孔阵列、Logo 贴花（沿用 `backDecalTexture`） |
| 侧面 | 音量键、充电口（圆孔）、耳机孔、挂绳孔 |
| 拆解层 | `front`（屏幕 + 键盘膜）/ `frame` / `inner`（PCB canvas 贴图 + 小电池块 + 喇叭）/ `back`，与现有爆炸视图机制兼容 |
| 锚点 | `anchors.screen / keypad / back / battery` + 概念件锚点（沿用 `SPOT` 机制，按键包提供自己的 `SPOT_KEYPAD`） |

**尺寸**：`dims = { w: 46–52, h: 105–118, t: 13–18 }`（mm 量级比例，与现代机 72×152 不同；`PhoneStage.resize` 的相机距离按 `dims.h` 自适应，现有代码已按 dims 设置底座高度，需检查 `baseZ` 是否需要按 h 缩放）。

### 4.5 FeatureOS（`featureOS.js`）

**导出**：`createFeatureScreen(design, { width = 240, height = 320 })`，返回与 `createLiveScreen` 相同接口。

**渲染**：
- 低分辨率画布（单色屏 96×64 像素、彩屏 128×160、大彩屏 176×220），绘制后**最近邻放大**到纹理（`magFilter = NearestFilter`），呈现真实像素感。
- 单色屏配色：底 `#9bbc0f`、字 `#0f380f`（经典绿屏）；彩屏用 16 色调色板。
- 公共元素：状态栏（信号格 5 格、电池格 3 格、运营商名「华夏通信」、时间）；软键提示（「菜单 / 名片夹」）。

**v0.12 模式**：
| 模式 | 内容 |
|---|---|
| `standby` | 运营商名 + 大时间 + 日期 + 待机图片 |
| `menu` | 3×3 九宫格像素图标（信息、通话记录、名片夹、设置、多媒体、游戏、工具、铃声、上网） |
| `sms` | 收件箱列表 → 打开一条短信 |
| `call` | 来电界面：「来电：老周」+ 绿 / 红键提示 + 震动偏移 |

（`snake / ringtone / bigfont / sos / camera / signal / mp3 / radio / color-bloom` 在 v0.14 补齐。）

**帧率**：`paint(now)` 内 33ms 节流；像素画面只在内容变化或动画帧时重绘。

**工厂**：`screenOS.js` 新增 `export function createScreenFor(design, opts)`，`PhoneStage.setDesign` 与 `buildPhone` 调用处改用工厂。

### 4.6 过渡节目单（`keynote-keypad.js` v0.12 版）

段落：`greet`（正式开场白）→ `look`（外观，`screen:'standby'`）→ `screen`（屏幕规格，`screen:'menu'`，KPI「26 万色」）→ `standby`（KPI「待机 20 天」）→ `ringtone`（KPI「64 和弦」，`screen:'call'`）→ `price` → `countdown` → `end`。
所有 `sub / react / kpi.label` 从 `keypad.js` 的文案表取；不含 `film`（v0.14 加）。

### 4.7 制式竞赛（基础）

- `keypad.techRace = { kind: 'network', levels: ['GSM','GPRS','EDGE','3G'], worldLevelAt: (m) => …, lagEffect: { fair: -0.10, media: -5, lead: +4 } }`。
- `design.parts.network`（0–3）为玩家选择；可选上限 = 世界已出现的最高档（未出现的档位在配置台显示锁定与「约第 X 月出现」）。
- `techLag(state, design)` 统一替换 `chipLag` 的调用点（`fairPrice`、`finalizeScores`、`demandUnits`、`salesForecast`、`crowd` 上下文、keynote ctx）。

### 4.8 v0.12 Definition of Done

- ERA_PLAN 5.6 八条验收全部有证据。
- `npm run build` 通过；`node scripts/test-v011.mjs`、`test-tail-sales.mjs`、`test-era-lint.mjs` 通过。
- `scripts/audit-era.cjs feature` 截图入库 `docs/era-audit/v0.12/`。

---

## 5. v0.13 实现：老年机 / 翻盖 / 滑盖 / 场景

### 5.1 形态数据

`forms.js FORM_FACTORS` 新增 `flip`、`slider`、`swivel`（`era: 'keypad'`、`unlockMonth` 按 ERA_PLAN 8.3）；`productEraOf` 映射加入它们。

### 5.2 3D 原型（`phone3d-keypad.js` 扩展）

`archetypeOf(design)`：`elder | bar | flip | slider | swivel`。

| 原型 | 结构 | 动画（`anim` / `ctl`） |
|---|---|---|
| `elder` | 直板骨架；键帽 scale ×1.6、键距加大；左侧红色 SOS 键（`ExtrudeGeometry` 圆角 + 「SOS」贴花）；顶部 LED（`CircleGeometry` + `emissive`）；底部挂绳孔 + 挂绳（`TubeGeometry` 沿 `CatmullRomCurve3`，带轻微摆动） | `ctl.torch` 开关：LED `emissiveIntensity` 0 → 2，并在 `PhoneStage` 加一盏 `SpotLight` 照向前方；挂绳随机身旋转惯性摆动 |
| `flip` | 两个 `Group`：`upper`（主屏 + 听筒 + 外屏）与 `lower`（键盘），`upper` 以转轴为枢轴（枢轴 `Group` 放在接缝处，`upper` 相对它偏移） | `ctl.open` 0..1：`hinge.rotation.x = -π * 0.92 * (1 - open)`；`cyc()` 每 6 秒开合，接入现有「聚焦保持展开」机制；外屏贴图显示时间 |
| `slider` | `upper`（屏幕面板）叠在 `lower`（键盘）上 | `upper.position.y = open * h*0.42`，`easeOutBack` 回弹 |
| `swivel` | 屏幕面板绕 Z 轴旋转 | `upper.rotation.z = open * π` |

**音效**：`sfx.flipOpen()`（短促「啪」：噪声 + 低频）、`sfx.slideClick()`；在 `ctl.open` 越过 0.95 / 0.05 时触发（去抖）。

**PhoneStage**：新增 `toggleOpen()`；设计台视图按钮行在按键原型时多一个「开合」按钮。

**缩略图 / 分享图**：`snapshot()`、`cutout()` 对 `flip / slider` 固定为半开 `open = 0.6` 拍摄；`share.js` 无需改动（用截图）。

### 5.3 外观选项（按键包 `lookOptions`）

| key | 选项 | 3D / 屏幕表现 |
|---|---|---|
| `keyLight` | white / blue / orange / rainbow | 键帽 emissive 颜色；rainbow = 跑马灯相位动画 |
| `bootAnim` | brand / handshake / custom | FeatureOS 新模式 `boot`（设计台点「开机」预览；发布会开场使用） |
| `standbyPic` | scenery / cartoon / family | `standby` 模式背景像素画（三张 canvas 程序绘制） |
| `lanyard` | none / red / black / rainbow | 挂绳颜色（老年机默认 red） |
| `sticker` | none / cartoon / stars | 背面贴花层 |

### 5.4 按键创新补全

- `parts.js CONCEPTS` 追加 22 项（ERA_PLAN 6.4），每项带 `era: 'keypad'`、`appear: { month }`、`caps`、`cost`、`thick`、`weight`、`buzz`、`risk`；`keypad.conceptIds / practicalIds` 列出。
- 3D 表现：每项在 `phone3d-keypad.js` 有可见部件或 `SPOT_KEYPAD` 锚点（例：FM → 顶部耳机线天线标签；MP3 → 侧面音乐键；手机电视 → 顶部可旋转电视天线；跑马灯 → 机身边缘灯条 emissive 循环；SOS / 手电筒 → 已在原型中）。
- `COMBOS` 拆成 `smart.combos` 与 `keypad.combos`。

### 5.5 像素场景（`scenes.js`）

- `phone(x, y, w, h, color, opts)` 增加 `opts.archetype`：
  - `bar`：上 40% 屏（单色绿 / 彩色）、下 60% 3×4 像素键点阵；
  - `flip`：两段 + 中间转轴像素线，`opts.open` 控制；
  - `elder`：大键点阵 + 红点 SOS；
  - `slider / swivel`：对应偏移。
- `sales` 场景按世界时代分支：按键时代绘制**营业厅柜台**（玻璃柜、价签牌「预存话费送手机」、背景运营商色带），排队人群在父母刚需定位时加入老人像素角色（复用 `person()` 并加拐杖 / 白发参数）。
- `dev / factory / next / hq` 中的手机统一走 `phone()`，传入当前 design 的原型。

### 5.6 v0.13 DoD

ERA_PLAN 6.6 六条验收有证据；3D 性能：按键原型 draw call ≤ 现代机（实例化键帽保证）。

---

## 6. v0.14 实现：发布会、舆论、测试

### 6.1 按键节目单（`keynote-keypad.js` 完整版）

- 段落生成函数按 ERA_PLAN 7.3 表格实现；每段字段：`{ key, chap, film:{name,data}, screen, pose, kpi, sub, react, mood, sfx, ms }`。
- **动态性**：段落按玩家配置出现（无摄像头不出拍照段；老年机出大字 + SOS；翻盖出开合；首发创新出「全球首发」段）；卖点承诺未兑现时 `react / sub` 切换为起哄版本（与智能包一致的机制）。
- 发布会定制 `keypad.launchOpts`：`openTone: formal | ringtone | rugged`、`light: gala | business | brand`、`screenTheme: standby | family | boot`、`camera`（复用）。

### 6.2 按键产品短片（`films-keypad.js`）

全部为 `FILMS[name](g, W, H, t, data)` 纯函数，DPR 画布绘制：

| 名称 | 实现要点 |
|---|---|
| `kp_material` | 复用 `material` 的微距推近框架，换成按键机正面一角（键帽倒角高光 + 屏幕边框） |
| `kp_colorbloom` | 网格像素：先全部 `#9bbc0f/#0f380f` 两色，再以中心为圆心半径扩散，把每格替换为 16 色 → 65K 渐变 → 26 万色渐变；扩散波前带白色高光 |
| `kp_ringtone` | 三层声波（正弦叠加），层数随时间增加；音符精灵从中心飞出；同步调用 `sfx.ringtone(level)` |
| `kp_standby` | 日历页（翻页用 `scaleY` 压缩 + 阴影），电量格按天递减；右侧竞品电量更快归零并出现「关机」 |
| `kp_drop` | 砸核桃：核桃破裂（多边形碎片物理），随后 1.5 米跌落慢动作（弹跳曲线 `abs(sin)` 衰减） |
| `kp_bigtext` | 普通字号 → 超大字号逐级放大对比 |
| `kp_sos` | SOS 键按下 → 波纹 → 屏幕「正在呼叫：儿子」→ 画面右侧另一台手机震动响铃 |
| `kp_t9` | 九宫格按键依次高亮，屏幕逐字出现「我爱你」 |
| `kp_dualsim` | 两张 SIM 卡插入，两组信号格满格 |
| `kp_camera` | 30 万像素样张：马赛克块从 16px 降到 4px，主讲人台词同步 |

### 6.3 FeatureOS 补齐模式

`snake`（自动寻路吃豆，20×12 网格）、`ringtone`（均衡器柱）、`bigfont`、`sos`（红色闪烁 + 呼叫动画）、`camera`（像素取景框）、`signal`（信号格起伏）、`mp3`（播放器 + 进度条）、`radio`（频率刻度滑动）、`boot`（开机动画三种）。

### 6.4 舆论呈现

- `keypad.crowd.liveStyle = 'smswall'`：`playReveal` 中弹幕容器加类名 `.lo-dm.sms`，每条渲染为短信气泡（发信号码用 `13X****XXXX` 随机格式），从底部上推而非横向飞过（CSS 动画切换）。
- `keypad.crowd.style = 'bbs'`：`commentBlock()` 在 bbs 模式下输出论坛帖结构：标题行（媒体测评帖标题 = `headlines` 之一）、楼层号、`沙发 / 板凳 / 地板` 前三楼固定短回复、`顶 N` 代替点赞、精华标记代替热评；`liveComments` 的涌入 / 排序 / 定格机制原样复用（楼层号在定格后按顶数重排时保持「楼层号不变、显示顺序按顶」——与论坛「按热度查看」一致）。
- `buildComments(ctx)`：按 `packOf(ctx.design).crowd` 取池；世界时代为智能机而产品为按键时，额外注入「时代反差」意图（`retro` 池：「现在谁还买按键机？——我买给我妈」）。

### 6.5 工程机测试

- `keypad.tests`：`drop / standby / call / signal / keylife`，每项 `draw(g, t)` 为 240×135 像素画（与现有跑分风格一致）；结果「综合可靠性」= 基于 `slots.battery`（待机与耐用）与材质、形态的加权。
- `bench.js` 标题、按钮文案取 `pack.testCopy`（按键：「工程机测试 / 开始测试」）。

### 6.6 媒体标题

`wowNow()` 中 headline 选择逻辑改为 `pack.headlines[situation]` 随机取，situation 枚举保持现有判断（`stale / buzzRough / greatNovel / chipLead / …`），按键包提供对应报纸 / 杂志口吻文案。

### 6.7 v0.14 DoD

ERA_PLAN 7.4 七条验收；`test-era-lint` 扩展到「节目单全部文本 + 400 局弹幕 / 论坛帖」。

---

## 7. v0.15 实现：编年史、革命、制式、事件

### 7.1 模式与时间轴

- `state.mode: 'chronicle' | 'quick'`，`createNewGame(name, chip, mode)`；创建公司页增加模式选择卡。
- `eras/index.js` 增加 `TIMELINES = { chronicle: [...], quick: [...v0.11 FORM_ERAS] }`，`worldEraOf(state)` 读对应表；`forms.js` 的 `unlockMonth` 改为 `unlockAt(mode)` 函数（chronicle 与 quick 不同月份）。
- `RUN_MONTHS` → `runMonths(state)`（60 / 36）；所有引用点（结局判定、档期日历、HUD）替换。
- **快速局零变化**：quick 时间轴与 v0.11 完全一致，旧存档迁移为 quick（§10）；新游戏的模式选择卡默认选中 `chronicle`。
- quick 下按键形态同样走 `keypad` 包；`keypad.techRace.worldLevelAt` 按 mode 取表：chronicle `GSM 1 / GPRS 6 / EDGE 12 / 3G 19`，quick `GSM 1 / GPRS 4 / EDGE 7`，quick 第 10 月起世界包切为智能包（芯片竞赛沿用 v0.11 公式）。

### 7.2 智能机革命

- 触发：`advanceMonth` / `goNextGen` 中检测 `mode === 'chronicle' && month >= 19 && !state.flags.revolution` → `state.pendingRevolution = true`，下一次渲染企划前展示。
- 演出：新 `src/launch/revolution.js`：全屏层，复用 `PhoneStage` 渲染一台现代触屏机（`bar` 形态 + `screenOS` 的 `home` 模式），外面套像素电视边框（CSS + canvas），配合 `films` 的打字字幕与观众惊呼音效；30 秒，可跳过。
- 抉择：以行业大事卡呈现（复用 `marketEventCard` UI），三个选项写入 `state.revolution = 'pivot' | 'dual' | 'hold'`，效果通过 `mods` 实现：
  - `mods` 结构扩展 `{ key, val, until, forms?: string[], decay?: { perMonth, from } }`；
  - `marketMod(state, key, design)`：若 `forms` 存在，只对匹配形态生效；`decay` 型按 `(1 - perMonth) ^ (month - from)` 计算。
  - `mods` 新增 `floor` 字段：`decay` 结果不低于 `floor`。
  - **行业趋势（任何选择都加）**：`{ key:'demand', forms:['feature','flip','slider','swivel'], decay:{ perMonth:0.03, from:19 }, floor:0.25 }`；
  - `hold`：额外 `{ key:'demand', forms:[同上], decay:{ perMonth:-0.01, from:19 }, until:36 }`（与趋势相乘≈每月 −2%，第 37 月起失效），`faith +8`，`flags.touchExp = -5`；
  - `pivot`：在售按键机 demand ×0.8 一次性 + `flags.touchExp = +10`（首代智能机完成度修正，在 `wowNow` 完成度计算处读取）；
  - `dual`：`{ key:'rnd', val:0.9, until: month+6 }`（`advanceMonth` 研发增量乘它）。
- **老年机刚需**：`elder` 不挂趋势 mod；`demandUnits` 中 `elder` 形态在智能机时代后使用独立的 `elderMarket = 0.35`（相对按键时代普通市场规模），生命周期 `LIFE_MONTHS_BY_FORM.elder = 30`；`test-era-econ` 断言「只做老年机」≤ 最优策略 0.8 倍、普通按键机第 60 月需求 ≥ 25%。

### 7.3 制式时间表

`keypad.techRace.worldLevelAt(month)`：chronicle 下 `GSM(1) → GPRS(6) → EDGE(12) → 3G(19)`；3G 由「牌照」事件解锁（`flags.license3g`）。3G 后 `worldPack` 切换为智能包，`techRace` 自动换成芯片竞赛（`marketChipGen` 在 chronicle 下从第 19 月起算：`1 + floor((month - 19) / 10)`）。

### 7.4 事件、天使、投资、引导、术语、结局

| 系统 | 改造 |
|---|---|
| `EVENTS / MARKET_EVENTS / AFTERMATH_EVENTS` | 每条加 `eras: ['keypad'] / ['smart'] / ['fold']`（缺省 = 全部）；池子过滤 `worldEraOf(state)`；`AFTERMATH` 额外按产品时代过滤 |
| 新时代事件 | ERA_PLAN 8.4 表格 7 条，数据加入 `MARKET_EVENTS`，效果复用现有 `applyMarketEffect`（新增 `contract` 效果：一次性大订单 = 立即入账 + 下一代品牌曝光 −） |
| `angels.js` | 卡片加 `eras`；`angelPool` 过滤 |
| `EXPANSIONS` | 加 `eras`；按键时代新增「营业厅专柜 / 县城代理商 / 自建贴片厂」 |
| `TUT` | `worldPack(state).tutorial[phase]`；革命时追加一次性引导 `tutorial.revolution` |
| `glossary.js` | `TERMS` 每条加 `eras`；`installGlossary` 读取全局 `currentEra`（`ui.render` 时设置） |
| `endingTitles` | 新称号规则；`state.chronicle[]` 在 `enterNext` 时追加 `{ gen, month, era, form, name, sold, lifeSold, profit, revolutionChoice }`；结局页渲染编年史时间轴 |
| HUD | 时代徽章：`worldPack(state).name + badgeColor`；点击弹出时代说明卡（复用 `stat-pop` 组件） |

### 7.5 音乐时代配器

`music.js` 增加 `setFlavor('chip' | 'modern')`：`chip` 时 lead 使用 `square` + 短 decay（芯片音）、pad 改为 `pulse` 波形琶音、鼓组更轻；发布会情绪的旋律动机加入一段固定的「和弦铃声」乐句（4 小节，按 `section` 随机移调）。`sfx.syncBgm(phase)` 时根据 `worldEraOf(state)` 调用 `setFlavor`。

### 7.6 v0.15 DoD

ERA_PLAN 8.6 六条验收；`scripts/test-era-econ.mjs` 断言 8.5 的数值约束。

---

## 8. v0.16 实现：打磨与性能

| 项 | 实现 |
|---|---|
| 时代转场 | `src/launch/eraTransition.js`：全屏 canvas，旧时代代表机型（玩家该时代最高销量机型的 `cut` 图）淡出 + 新时代剪影亮起 + 年份数字滚动；在世界时代变化的第一次 `render` 播放 |
| 编年史机型馆 | `ui.js` 年终会「机型馆」与结局页改为横向滚动时间轴组件 `chronicleStrip(state)`；按 `era` 分段着色，节点为缩略图 + 形态剪影 |
| 年度报纸 | 每 12 个月在 `enterNext` 后插入 `P.newspaper`：头版大图（年度机型）、三条新闻（行业大事 / 竞品 / 你的成绩），文案由 `worldPack.newspaper` 模板填充 |
| 按键音 | `sfx.keyBeep()`：按键时代 UI 点击替换 |
| 低端机模式 | 自动检测（首帧耗时 > 40ms 连续 30 帧）：关闭粒子、短片降 DPR 到 1、FeatureOS 降到 20fps |
| 减少动效 | 短片改为静态关键帧（`t` 固定为每片 2.4s）+ 文字；转场改为淡入淡出 |
| 文案通读 | 导出脚本 `scripts/dump-copy.mjs`：把两个包的全部可见文本导出为 Markdown，人工通读 |

---

## 9. 测试与工具

### 9.1 `scripts/test-era-lint.mjs`（每版本必跑）

1. 对 `keypad` 包：枚举全部形态 × 定位 × 卖点 × 关键配置组合（约 200 组），调用纯函数生成文本：部件标签与说明、研发槽名与评语、定位 / 卖点说明、`buildKeynote(ctx)` 全部段落的 `chap / sub / react / kpi.label`、`danmakuLines` × 400、`buildComments` × 400、按键时代事件 / 天使 / 投资 / 引导 / 术语、headlines。
2. 用 `keypad.bannedWords` 扫描，命中即打印「文本 + 来源函数 + 组合」并 `exit 1`。
3. 反向：对 `smart` 包扫描按键专属词（防泄漏）。
4. 去重检查：同一场弹幕 / 同一帖评论无重复句。

### 9.2 `scripts/test-era-econ.mjs`（数值）

复用此前 `sim2` 的策略模拟框架，移入仓库：
- 按键时代策略：父母刚需走量、时尚翻盖高端、商务全键盘、山寨快钱；每策略 50 局 × 第 1–18 月；断言 ERA_PLAN 5.5 / 6.5 区间。
- 革命三选择 × 50 局完整编年；断言 8.5（最终现金差距 ≤ 1.5 倍，三者均可通关）。
- 现代线策略（快速局）：断言与 v0.11 基线差异 < 5%（防止底座重构改动数值）。

### 9.3 截图巡检 `scripts/audit-era.cjs`（Playwright）

- 参数：`feature | elder | flip | chronicle | quick`。
- 自动走完一代 / 一局，逐阶段截图（含发布会每 1.4 秒一帧），输出到 `docs/era-audit/<版本>/<场景>/`。
- **现代线回归**：`quick` 场景与上一版本的截图做像素比对（Python Pillow 计算差异比例，阈值 2%；3D 与随机内容区域使用固定随机种子 `?seed=` 参数——需要在 `ui.js` / `crowd.js` / `keynote.js` 中把 `Math.random` 改为可注入的 `rng()`，v0.12 一并完成）。

### 9.4 代码约束检查

`scripts/check-imports.mjs`：grep `src/` 中除 `eras/` 外对 `PARTS|SLOTS|POSITIONING|SELL_POINTS|PRICE_BANDS|POS_BASE_PRICE|POINT_RULES` 的直接引用，非白名单即失败，保证新代码都走 `packOf`。

### 9.5 已有测试

`test-v011.mjs`、`test-tail-sales.mjs` 每版本必须继续通过；v0.15 起 `test-v011` 的时间轴断言改为针对 `quick` 模式。

---

## 10. 存档迁移

| 版本 | 存档 | 迁移 |
|---|---|---|
| v0.11 | `version: 2` | — |
| v0.12 | `version: 3` | `loadGame` 接受 2 或 3；2 → 3：`design/designDraft.formFactor` 缺省按 `defaultFormId(month)`；`parts.keyboard/ringtone/network` 缺省 0；`product.era = productEraOf(...)`；在售机型 `era` 字段补齐 |
| v0.15 | `version: 4` | 3 → 4：`mode = 'quick'`、`flags = {}`、`chronicle = []`（由 `models` 回填）；进行中的局按快速局继续 |

所有迁移写成纯函数 `migrate(data)`，`scripts/test-migrate.mjs` 用三份历史存档样本（v0.11 进行中 / 年终 / 结局）验证可读、可继续推进 1 个月不报错。

---

## 11. 性能预算

| 项 | 预算 | 手段 |
|---|---|---|
| 按键 3D draw calls | ≤ 现代机（约 60） | 键帽 `InstancedMesh`；文字 plane 共享材质 |
| FeatureOS 绘制 | ≤ 1ms / 帧（30fps） | 低分辨率画布 + 最近邻放大；脏标记 |
| 短片画布 | DPR ≤ 2；低端模式 1 | 已有 `fit()` |
| 发布会内存 | 段落间不累积 DOM | 反应气泡 / 弹幕定时移除（已有），短信上墙限制 12 条 |
| 构建体积 | 新增 JS ≤ 120KB（未压缩 ≤ 400KB） | 按键包与短片 `import()` 懒加载（与现有 phone3d 一样按需） |

---

## 12. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 底座重构改坏现代线 | 已上线体验退化 | v0.12 先做「零行为变化」迁移并以测试 + 截图比对守门，再加按键内容 |
| `ui.js` 过大（2411 行）冲突频繁 | 开发慢、易出错 | 新增 UI 以小模块形式放入 `src/ui/`（`formCards.js`、`chronicleStrip.js`、`bbsComments.js`），`ui.js` 只做组装 |
| 企划流程调整影响老玩家习惯 | 困惑 | 新手引导第一步讲「先决定做什么形态」；快速局默认选中推荐形态 |
| 3D 新原型工作量大 | 进度 | 先做 `bar`（v0.12），再在其骨架上派生 `elder / flip / slider / swivel`（v0.13），共享键盘与屏幕子模块 |
| 内容量大导致漏词 | 出戏 | 黑名单测试 + 文案导出通读 + 截图巡检三重保障 |
| 随机性使截图比对不稳定 | 回归误报 | 注入式 `rng()` + `?seed=` 固定种子 |
| 时长 60 个月导致疲劳 | 中途流失 | 年度报纸、时代转场作为节奏点；自动存档；快速局保留 |

---

## 13. 自审记录

| # | 自查问题 | 发现 | 处理 |
|---|---|---|---|
| 1 | 是否每个 ERA_PLAN 问题编号都有对应实现位置？ | 初稿缺 E5（研发评语）、H5（媒体标题）、L4（分享图）的实现说明 | 已补：E5 → 4.2 `commentFor`；H5 → 6.6；L4 → 5.2 缩略图 / 分享图 |
| 2 | 研发槽 id 换不换？ | 换 id 会牵动大量公式 | 决定 id 不变、只换显示层（2.2），把风险降到最低 |
| 3 | 设计台能否跨时代切形态？ | 若允许，定位 / 卖点会失配（A5 复发） | 4.3：设计台只允许同产品时代内切换，跨时代回到企划 |
| 4 | 按键机尺寸与现代机差异大，舞台相机是否适配？ | `PhoneStage.resize` 的 `baseZ` 写死比例 | 4.4 标注需按 `dims.h` 缩放相机距离，作为 v0.12 任务 7 的子项 |
| 5 | 截图回归如何稳定？ | 现有大量 `Math.random` | 9.3：v0.12 引入可注入 `rng()` 与 `?seed=` |
| 6 | 快速局能否真正零变化？ | v0.15 改时间轴可能影响 quick | 7.1：quick 时间轴为 v0.11 原表；`test-era-econ` 断言现代线数值差异 < 5% |
| 7 | 老年机在智能机时代需求不降，会不会成为无脑最优？ | 有风险 | 老年机单台利润低（¥60–150）且市场规模有上限（`elderMarket` 系数），在 `test-era-econ` 中加入「只做老年机」策略，断言其最终现金不超过最优策略的 0.8 倍 |
| 8 | 智能机时代后芯片竞赛的起点月份 | 若沿用 `1 + floor((m-1)/10)`，第 19 月一进入就落后 2 代 | 7.3：chronicle 下从第 19 月起算 |
| 9 | 存档 version 两次升级是否会互相影响？ | 迁移顺序 | 10：链式 `migrate`，2→3→4，单独测试脚本覆盖 |
| 10 | 短片与 `main` 的屏显（`screen` 字段）如何共存？ | 两套演出语言 | 4.1 任务 1：段落先放 `film`（全屏），切回舞台时再设置 `screen` 模式，二者顺序明确 |
| 11 | ERA_PLAN 拍板决定是否已同步？ | 模式默认、革命强度、快速局定义三处需改 | 已同步到 7.1、7.2（趋势 mod + `floor`、坚守减缓、老年机 0.35） |

---

*文档结束。实现顺序与验收以 ERA_PLAN 为准；本文每节末的 DoD 是代码层面的完成定义。*
