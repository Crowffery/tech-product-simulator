# 音频手记 · 《电子产品发展国》

面向本仓库 casual 竖屏原型的实用笔记：把公开可查的游戏音频常识，映射到开罗味经营反馈。**不编造名人原话**；下列原则来自公开博文 / GDC 风格分享里反复出现的共识。

## 公开共识（高一层）

### 1. 分层与优先级（layers）
UI / 反馈 / 音乐不要抢同一条「注意力带宽」。导航点击应安静短促；确认与奖励可更亮；错误/破产要可辨但别刺耳；BGM 垫在底下，重要反馈时可略 duck。  
参考方向：[SFX Engine — Game UI Sounds best practices](https://sfxengine.com/blog/best-practices-for-game-ui-sounds)、[Audiokinetic — Approaching UI Audio from a UI Design Perspective (Part 2)](https://www.audiokinetic.com/en/blog/approaching-ui-audio-ui-design-perspective-2/)。

### 2. 反馈时机（timing）
本地手势音效应在识别点击后**立刻**出声（常见经验阈值约 ≤100ms），否则会显得「界面钝」。网络确认类可以先 optimistic「收到」，失败再换另一声。  
参考：[Design Atlas — Sound feedback timing](https://design.solhun.com/en/sound/sound-feedback-timing/)。

### 3. 微交互长度
常规 UI 点击建议约 **100–300ms**；同一种点击可做轻微音高/音色变化，减少疲劳。本包程序化 SFX 大多落在该区间。

### 4. 成功 / 失败轮廓
公开 UI 音效文章里常见对照：成功偏**上行、协和、收束干净**；失败偏**下行、音色变钝或略不协和**——区别应靠轮廓，而不是只靠音量。  
参考：Audiokinetic 上文；[Flutu — Crafting Effective Interface Sound Design](https://flutumusic.com/2023/12/19/interface-sound-design/)。

### 5. Loop bed（循环床）
菜单与经营界面用轻量可循环垫乐即可；场景切换时换床或加层，比硬切更顺。Nintendo 系公开分析里常提到：菜单选择逐步叠乐器/能量（例：GameDev.net 对马里奥赛车菜单自适应音乐的讨论），casual 经营也可做「办公室床 ↔ 发布会床」两档。  
参考：[Adaptive audio in menus (GameDev.net)](https://gamedev.net/blogs/entry/2273212-adaptive-audio-in-menus-game-developments-untapped-opportunity/)。

### 6. 开罗 / 休闲经营向的手感
公开讨论里，Kairosoft 一类作品强调：**短反馈密、音效「俏皮」、不盖过可读 UI**。本游戏节奏是「底部大按钮 + 阶段弹窗 + 发布会高光」，音频应跟着阶段走，而不是全程同一床。

## 映射到本游戏

| 场景 | 音频职责 | 本包资产 / 行为 |
|------|----------|-----------------|
| 通用点击 | 即时微交互 | `ui/click`；WebAudio 兜底 |
| 确认企划 / 定稿 | 比 click 更亮的确认 | `ui/confirm`；`keep()` 也走 confirm |
| 取消 / 返回 | 略下行 | `ui/cancel` |
| 翻页 / 进创建 | 纸感短噪 + 轻音 | `ui/page-turn` |
| 研发加点 / 月推进 | 小奖励 | `feedback/add-points`；studio `part()` |
| 办公室升级等 | 短 fanfare | `feedback/level-up` |
| 突发状况弹窗 | 引起注意 | `feedback/event-popup` |
| 倒闭 | 失败 stinger + VO | `feedback/bankruptcy` + `vo/hint-bust` |
| 存档 / 读档 | 轻「落盘」感 | `feedback/save` |
| 发布会揭幕 | roll → boom → 和弦 | `marketing/press-reveal`；BGM → `bgm/press` |
| 媒体分揭晓 | 评分 stinger | `marketing/media-score` |
| 首月销量大数 | 上行琶音 | `marketing/first-month-sales-big-number` |
| 欢呼 | 噪声掌声床 | `marketing/cheer` |
| 经营日常 | 轻快办公室 loop | `bgm/office` |
| 发布会 / 评分 | 稍亮稍快 loop | `bgm/press` |

## 实现要点（工程）

- **双通道**：`public/audio/**` 文件（OGG/MP3）+ `src/studio/sfx.js` 内 WebAudio 合成兜底（发布会鼓点、快节奏 `part` 等仍可走合成，避免密集加载）。
- **静音**：HUD 🔊/🔇，键名 `epdg-studio-mute`（`localStorage`，经 `storage.js` 安全封装）；静音时 SFX/BGM/VO 全停，BGM 恢复时续播。
- **性能**：SFX 池最多 3 个 `HTMLAudioElement`/stem；BGM 单实例 loop；VO 有冷却，避免刷屏。
- **移动端**：首击 `unlock()` 恢复 `AudioContext` 并试播；优先 OGG，不支持则 MP3。

## 再生

```bash
python3 tools/generate_audio.py          # SFX + BGM
# 可选 VO（需本机 Piper + zh 模型，见 AUDIO_SOURCES.md）:
PIPER_BIN=... MODEL=... ESPEAK_DATA=... ./tools/generate_vo.sh
```

更细的文件清单与许可见 [AUDIO_SOURCES.md](./AUDIO_SOURCES.md)。
