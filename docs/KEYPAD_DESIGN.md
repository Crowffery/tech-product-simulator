# 按键机外形设计语言

那个年代的手机不是圆角长方体。每一款都在轮廓、侧面弧度、键盘排布上下了功夫：

- **整体轮廓**：宽肩、收腰、圆下巴；索爱 T610 看似方正，实际上处处都是细微的弧度 [1]；2000 年代初各家都在尝试新形态，取代老式直板 [2]。
- **翻盖**：蛤壳式圆顶上盖 + 铰链筒，外侧有小外屏；RAZR 走的是另一条路——超薄、金属、平直，键盘是蚀刻的金属平板 [3]。
- **细节**：屏幕窗是带弧顶的镜片；方向键是椭圆环或小摇杆，两侧是弧形软键；数字键是胶囊形，排成「微笑弧线」。

## 游戏里的实现（`src/studio/phone3d-keypad.js`）

| 轮廓 | 用在 | 特征 |
|---|---|---|
| 鹅卵石 pebble | 功能机默认、老年机可选 | 宽肩、微收腰、圆下巴，镜片顶部拱起 |
| 沙漏腰身 waist | 功能机、滑盖 | 明显收腰 + 镀铬描边，摇杆式方向键 |
| 圆润糖果 candy | 老年机默认、滑盖、旋转屏 | 大圆角、厚实 |
| 圆顶蛤壳 clam | 翻盖默认 | 圆顶上盖、圆底下盖、铰链筒，外侧圆形外屏 |
| 超薄金属 slim | 翻盖可选 | 13.9mm、金属机身、蚀刻平板键盘、矩形外屏 |

做法：轮廓用镜像样条曲线生成，挤出时用大倒角（约机身厚度的 1/3）做出鼓包侧面；前脸是可撞色的独立面板。翻盖绕铰链轴真正开合（合上时屏幕朝下压在键盘上，外屏朝外）；滑盖上片向上滑出；旋转屏绕左上角转轴转 90°。玩家可在设计台「外观」里选「机身轮廓」。

## 来源

1. [Sony Ericsson T610 (Mass Made Soul)](https://massmadesoul.com/se-t610)
2. [Dezeen remembers the mobile phones that time forgot](https://www.dezeen.com/2017/02/22/best-classic-mobile-phones-pre-iphone-design-roundup-technology/)
3. [The Motorola Razr V3: The Flip Phone That Defined an Era](https://feedme.design/the-motorola-razr-v3-a-cool-phone-before-smartphones-took-over)
