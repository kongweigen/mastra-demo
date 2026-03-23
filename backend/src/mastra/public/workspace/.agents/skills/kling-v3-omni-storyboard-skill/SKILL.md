---
name: kling-v3-omni-storyboard
description: Kling V3 Omni 分镜规范（镜头组机制 + 口型同步 + 内容描述）
model_match:
  - omni
  - kling-v3-omni
  - kling-video-o1
version: 5.0.0
---

# Kling V3 Omni 分镜规范

## 模型约束

| 约束 | 值 |
|------|-----|
| 单镜头时长 | 2-10 秒（整数） |
| 镜头组总时长 | **≤ 12 秒**（硬限制 15 秒，留 buffer） |
| 每组镜头数 | 2-5 个 |
| 画面比例 | 16:9, 9:16, 1:1 |
| 台词与时长 | 每秒 3-4 个汉字（见下方对照表） |

## 台词-时长对照表

| 台词字数 | 最短时长 | 推荐时长 |
|---------|---------|---------|
| 0（无台词） | 2s | 2-3s |
| 1-8 字 | 2s | 3s |
| 9-16 字 | 3s | 4-5s |
| 17-24 字 | 5s | 6-7s |
| 25-32 字 | 7s | 8-9s |
| 超过 32 字 | 必须拆为两个镜头 | — |

计算公式：`最短时长 = ceil(台词字数 / 4)`，台词字数为 0 时最短 2s。

## 时长变化

不同内容类型应匹配不同时长，避免所有镜头相同时长：
- 快切反应/表情：2-3s
- 短台词对话：3-4s
- 标准叙事/中等台词：4-6s
- 长台词/复杂动作：6-8s
- 大场景建立/过渡：3-5s

## 镜头组机制

同组镜头由后端合并为一次 API 调用，模型自动保持组内角色一致性。

**分组规则**：
- 同场景连续镜头 → 同组
- 场景切换 / 时间跳跃 → 必须分组
- **累计时长超 12 秒 / 镜头超 5 个 → 必须分组**
- 分组后立即验算：`sum(duration) ≤ 12`，超出则拆组

**不分组的镜头**（`group_id: null`）：过渡空镜、独立转场镜头。

## visual_prompt：镜头内容描述

`visual_prompt` 只描述**这个镜头里发生了什么**，不写运镜、色调、构图、光线等提示词工程内容。后续由 PromptEngineer 生成模型适配的图片/视频提示词。

正确写法：
- "林晚猛地从床上坐起，额头冷汗，睡衣被汗浸湿"
- "红灯笼被厚冰包裹，在狂风中剧烈摇晃"
- "二婶一把推开门，手指着林晚的鼻子"

禁止写法：
- "@林晚猛地坐起，冷汗浸透睡衣。特写，镜头跟随。" — 不要写 @占位符
- "暖黄色调，柔光侧打，浅景深，4K画质" — 不要写提示词参数
- "全景，固定镜头，冷蓝色调" — 运镜和色调由 PromptEngineer 决定

**写法要求**：
- 具体动作 + 可视化细节（表情、姿态、物件状态）
- 涉及角色时写角色名，后端自动绑定参考图
- 涉及场景时写场景名，后端自动绑定场景图
- 不写 `@`、`<<<>>>`、运镜、色调、构图、景深等

## dialogue 与口型同步

`dialogue` 自动映射为 Kling 的 `subtitle`，驱动角色口型和配音。

正确：dialogue: "把粮食交出来！"    speaker: "二婶"
错误：dialogue: "二婶：把粮食交出来！" — 不要带角色名前缀

- 一个镜头只能有一个 speaker
- 旁白中夹角色台词 → 拆为两个镜头
- 无台词：`dialogue: ""`, `speaker: ""`
- 台词超 15 字 → 拆为两个镜头

## 景别节奏

推荐：WIDE → CLOSE_UP → MEDIUM → CLOSE_UP → WIDE（交替）
避免：CLOSE_UP → CLOSE_UP → CLOSE_UP → CLOSE_UP（单调）

- 每组首镜通常 WIDE/MEDIUM 建立空间
- 连续 CLOSE_UP 不超过 3 个
- 情感高潮用 CLOSE_UP，场景转折用 WIDE

## 组间衔接

相邻组之间必须有衔接，避免叙事断裂：
- **情绪递进**：前组末镜情绪 → 后组首镜情绪自然过渡
- **动作延续**：前组末镜动作在后组首镜延续
- **声音桥接**：前组安静 → 后组首镜突然声响

## 案例

### g1 组（3 镜头，10s，同场景空镜）

```json
[
  {
    "group_id": "g1", "group_index": 0, "image_mode": null,
    "dialogue": "2026年除夕，成了人类文明的葬礼。",
    "speaker": "旁白",
    "action": "末日极寒全景",
    "visual_prompt": "零下八十度冰雪荒原，狂风卷起雪花，天地间白茫茫一片",
    "shot_type": "PANORAMA", "camera_movement": "pan right", "duration": 5,
    "characters": [], "scene": "极寒雪地",
    "gen_mode": "multi_shot", "audio_type": "none", "voices": [], "emotion": "fearful",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": true
  },
  {
    "group_id": "g1", "group_index": 1, "image_mode": null,
    "dialogue": "", "speaker": "",
    "action": "红灯笼被冻成冰坨子",
    "visual_prompt": "红灯笼被厚冰包裹，在狂风中剧烈摇晃，冰碴掉落",
    "shot_type": "CLOSE_UP", "camera_movement": "static", "duration": 2,
    "characters": [], "scene": "极寒雪地",
    "gen_mode": "multi_shot", "audio_type": "none", "voices": [], "emotion": "sad",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 2, "image_mode": null,
    "dialogue": "比寒冬更冷的是人性。",
    "speaker": "旁白",
    "action": "几个人影靠近微光房屋",
    "visual_prompt": "黑暗雪夜中几个模糊人影踏雪向透出微弱烛光的房屋逼近",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 3,
    "characters": [], "scene": "极寒雪地",
    "gen_mode": "multi_shot", "audio_type": "none", "voices": [], "emotion": "tense",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
  }
]
```

验算：dialogue "2026年除夕..." 15字→ceil(15/4)=4s，实际5s 合规；"比寒冬..." 8字→ceil(8/4)=2s，实际3s 合规。组总时长 5+2+3=10s ≤ 12s。

### g2 独立镜头（无组，场景切换过渡）

```json
{
  "group_id": null, "group_index": 0, "image_mode": null,
  "dialogue": "", "speaker": "",
  "action": "粗暴的手抢夺煤炭和粮食",
  "visual_prompt": "几双粗暴的手抢夺煤炭和粮食袋，煤块散落一地",
  "shot_type": "CLOSE_UP", "camera_movement": "static", "duration": 2,
  "characters": [], "scene": "极寒雪地",
  "gen_mode": "first_frame", "audio_type": "none", "voices": [], "emotion": "angry",
  "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
}
```

### g3 组（3 镜头，12s，角色对话）

```json
[
  {
    "group_id": "g3", "group_index": 0, "image_mode": null,
    "dialogue": "", "speaker": "",
    "action": "林晚猛地从床上坐起",
    "visual_prompt": "林晚猛地从床上坐起，额头满是冷汗，睡衣被汗浸湿",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 3,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "multi_shot", "audio_type": "voice_builtin", "voices": ["林晚"], "emotion": "fearful",
    "need_shot_image": true, "need_character_ref": true, "need_scene_ref": true
  },
  {
    "group_id": "g3", "group_index": 1, "image_mode": null,
    "dialogue": "又是这个梦……",
    "speaker": "林晚",
    "action": "林晚捂住脸颤抖",
    "visual_prompt": "林晚双手捂住脸，指缝间渗出泪水，身体微微颤抖",
    "shot_type": "CLOSE_UP", "camera_movement": "static", "duration": 3,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "multi_shot", "audio_type": "voice_builtin", "voices": ["林晚"], "emotion": "sad",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
  },
  {
    "group_id": "g3", "group_index": 2, "image_mode": null,
    "dialogue": "不行，这次我一定要改变结局。",
    "speaker": "林晚",
    "action": "林晚擦泪握拳",
    "visual_prompt": "林晚擦去泪水，眼神变得坚定，双手紧握床单",
    "shot_type": "CLOSE_UP", "camera_movement": "dolly in", "duration": 6,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "multi_shot", "audio_type": "voice_builtin", "voices": ["林晚"], "emotion": "determined",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
  }
]
```

验算：dialogue "又是..." 6字→ceil(6/4)=2s，实际3s 合规；"不行..." 14字→ceil(14/4)=4s，实际6s 合规。组总时长 3+3+6=12s ≤ 12s。

## 常见错误

- 一个镜头 4 个动作："惊醒+看窗帘+拿手机+哭" → 拆为 4 个镜头
- A 说话→B 说话，缺 B 反应镜头 → 中间插入 B 表情 CLOSE_UP
- 800 字只拆 8 个镜头 → 应该 32-48 个
- 连续 5 个 CLOSE_UP → 交替景别
- 30 字台词配 3 秒镜头 → 台词 30 字需 ceil(30/4)=8s，或拆为两个镜头
- 所有镜头都是 5 秒 → 根据内容类型和台词字数调整时长（2-10s 范围）
- 所有镜头都分组 → 独立过渡镜头/空镜应设 group_id: null
- 组总时长 14 秒 → 必须 ≤ 12 秒，拆为两组
- visual_prompt 写 "暖黄色调，柔光，浅景深" → 只写内容，不写提示词
- visual_prompt 写 "@林晚坐起" → 不要写 @占位符，直接写 "林晚坐起"
