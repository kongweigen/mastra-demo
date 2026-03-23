---
name: seedance-1-5-pro-storyboard-skill
description: Seedance 1.5 Pro 分镜规范（首帧/首尾帧 + 宫格图分组 + 原生音频）
model_match:
  - seedance-1-5
  - seedance-1.5
  - doubao-seedance-1-5
  - doubao-seedance-1.5
version: 4.0.0
---

# Seedance 1.5 Pro 分镜规范

## 模型能力

- 单镜头生成（不支持 multi_shot）
- 支持首帧图生视频（first_frame）
- 支持首尾帧图生视频（first_last_frame）：视频从首帧过渡到尾帧
- 原生音视频联合生成，口型毫秒级同步
- 时长: 4-12 秒（整数）

## 拆分步骤（按顺序执行）

### 第 1 步：拆镜头（一个镜头 = 一个动作）

核心原则：一个镜头只做一件事。一个动作、一句台词、一个反应 = 一个镜头。

镜头密度（必须达标）：
- 200字 → 至少 10 镜头
- 500字 → 至少 20 镜头
- 1000字 → 至少 40 镜头
- 拆完后数一下，不够就继续拆

对话拆分：
- 一个镜头只有一个说话者
- A 说话 → 切镜头 → B 说话（不是同一个镜头）
- 长台词（>20字）→ 拆为两个镜头
- 动作+反应拆开：A 推人 → 切 → B 后退 → 切 → B 回话

必须有的镜头（容易遗漏）：
- 场景建立镜头（进入新场景时的全景）4s
- 角色反应镜头（震惊、流泪、微笑）4s
- 动作特写（握拳、拿物品、关门）4s
- 场景切换过渡（空镜）4s

### 第 2 步：决定每个镜头的 gen_mode

根据镜头内容判断用首帧还是首尾帧：

first_last_frame（有动作变化的镜头）：
- 角色有明确动作：推门、站起、坐下、转身、走路、抢东西、推人
- 角色位置变化：从 A 移动到 B
- 场景状态变化：开门、关灯、物品散落
- 有台词+肢体动作的对话镜头

first_frame（静态或微动的镜头）：
- 空镜/环境镜头：风吹雪花、灯光闪烁
- 纯表情反应：角色表情变化但不涉及位置移动
- 场景建立镜头：全景展示环境
- 物品特写：静物、道具

大多数对话镜头有肢体动作（指、推、拦、退），应该用 first_last_frame。

### 第 3 步：分组（每组 4 个镜头）

规则很简单：同场景每 4 个连续镜头一组。

1. 同场景连续镜头 → 每 4 个一组（g1, g2, g3...）
2. 场景切换 → 必须新开一组
3. 同场景不足 4 个 → 也独立成组
4. 同场景超过 4 个 → 拆为多个组（4+4+剩余）
5. 组内 group_index 从 0 递增
6. 不要有不分组的镜头（除非是单独的过渡空镜 → group_id: null）

为什么是 4 个：后端按组生成宫格图，每个 first_last_frame 镜头占 2 格，first_frame 占 1 格。4 个镜头最多 8 格（全是首尾帧），刚好一张 3x3 宫格图。

示例：
```
剧本有 15 个镜头，3 个场景：

极寒雪地（3个镜头）→ g1（3个一组）
林家卧室（8个镜头）→ g2（前4个）+ g3（后4个）
过渡空镜（1个）→ null
医院走廊（3个镜头）→ g4（3个一组）

共 4 组 + 1 个独立空镜 = 4 张宫格图 + 1 张独立图
```

禁止：10 个镜头不分组（后端无法生成宫格图）。
禁止：1 个镜头单独成组又有 group_id（直接设 null）。

### 第 4 步：设定时长（短剧节奏必须快）

短剧节奏核心：大部分镜头 4s，少数 5s，极少 6s 以上。

| 台词字数 | 时长 |
|---------|------|
| 0（无台词） | 4s |
| 1-8 字 | 4s |
| 9-15 字 | 5s |
| 16-24 字 | 6s |
| 超过 24 字 | 拆为两个镜头 |

时长分布目标（以 20 镜头为例）：
- 4s: 12-14 个（60-70%）
- 5s: 4-6 个（20-30%）
- 6s: 1-2 个（极少）
- 7s+: 0 个（禁止）

禁止：全部 5s、全部 6s、超过 6s 的镜头。

### 第 5 步：设定景别和运镜

推荐交替：WIDE -> CLOSE_UP -> MEDIUM -> CLOSE_UP -> WIDE
- 每段开头 WIDE/MEDIUM 建立空间
- 连续 CLOSE_UP 不超过 3 个
- 情感高潮用 CLOSE_UP
- 场景转折用 WIDE

## visual_prompt 规范

只描述镜头中发生的具体内容，不写运镜、色调、构图。

正确：
- "林晚猛地从床上坐起，额头冷汗，睡衣被汗浸湿"
- "二婶推开门，手指着林晚的鼻子"

禁止：
- "暖黄色调，柔光侧打" -- 提示词工程由 PromptEngineer 负责

## 原生音频

有台词时 audio_type 设为 generate_audio，无台词设为 none。
每个镜头只有一个 speaker。

## 案例

profileHint: 支持首尾帧控制=是, 最大宫格帧数=9

### g1 组（4 镜头：1个first_frame + 3个first_last_frame → 格数=7 → 3x3）

```json
[
  {
    "group_id": "g1", "group_index": 0, "image_mode": null,
    "dialogue": "", "speaker": "",
    "action": "林家卧室全景建立",
    "visual_prompt": "昏暗的林家卧室，墙角堆着几袋粮食，油灯微弱的光照亮破旧的窗户",
    "shot_type": "WIDE", "camera_movement": "static", "duration": 4,
    "characters": [], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "none", "voices": [], "emotion": "tense",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": true
  },
  {
    "group_id": "g1", "group_index": 1, "image_mode": null,
    "dialogue": "把粮食交出来！",
    "speaker": "二婶",
    "action": "二婶推门闯入指着林晚",
    "visual_prompt": "二婶一把推开门冲进来，手指着林晚的鼻子，表情凶狠",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 4,
    "characters": ["二婶", "林晚"], "scene": "林家卧室",
    "gen_mode": "first_last_frame", "audio_type": "generate_audio", "voices": ["二婶"], "emotion": "angry",
    "need_shot_image": true, "need_character_ref": true, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 2, "image_mode": null,
    "dialogue": "", "speaker": "",
    "action": "林晚震惊后退",
    "visual_prompt": "林晚瞪大眼睛，不自觉后退一步，双手护在身后粮食袋前",
    "shot_type": "CLOSE_UP", "camera_movement": "dolly in", "duration": 4,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "first_last_frame", "audio_type": "none", "voices": [], "emotion": "surprised",
    "need_shot_image": true, "need_character_ref": true, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 3, "image_mode": null,
    "dialogue": "这是我们家的，你凭什么抢？",
    "speaker": "林晚",
    "action": "林晚双手张开挡住粮食",
    "visual_prompt": "林晚双手张开挡在粮食袋前，眼神坚定，嘴唇微微发抖",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 4,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "first_last_frame", "audio_type": "generate_audio", "voices": ["林晚"], "emotion": "determined",
    "need_shot_image": true, "need_character_ref": false, "need_scene_ref": false
  }
]
```

宫格图排列（首尾帧交替）：
```
3x3 宫格：
[1首帧] [2首帧][2尾帧]
[3首帧] [3尾帧][4首帧]
[4尾帧] [空]   [空]
注：镜头1是first_frame只占1格，镜头2/3/4是first_last_frame各占2格
```

### 独立空镜（group_id: null）

```json
{
  "group_id": null, "group_index": 0, "image_mode": null,
  "dialogue": "2026年除夕，成了人类文明的葬礼。",
  "speaker": "旁白",
  "action": "末日极寒空镜",
  "visual_prompt": "零下八十度冰雪荒原，狂风卷起雪花，天地间白茫茫一片",
  "shot_type": "PANORAMA", "camera_movement": "pan right", "duration": 4,
  "characters": [], "scene": "极寒雪地",
  "gen_mode": "first_frame", "audio_type": "generate_audio", "voices": [], "emotion": "fearful",
  "need_shot_image": true, "need_character_ref": false, "need_scene_ref": true
}
```

## 自检清单（拆完后必须检查）

1. 镜头数够不够？500字至少 20 个镜头
2. 是否所有镜头都有 group_id？同场景必须分组，每组 4 个
3. 有没有超过 4 个镜头的组？超过就拆
4. 时长分布：70% 是 4s？有没有超过 6s 的？
5. 每个镜头只有一个 speaker？
6. 有动作的镜头是否用了 first_last_frame？
7. 有台词的镜头 audio_type 是否 generate_audio？

## 常见错误

- 一个镜头塞了多个动作 → 拆开，一个动作一个镜头
- 10 个镜头不分组 → 每 4 个一组（g1, g2, g3）
- 一组超过 4 个镜头 → 拆为 4+4+剩余
- 全部 5-6s 时长 → 70% 应该是 4s
- 时长超过 6s → 禁止，拆为两个镜头
- 缺少分组 → 除了单独的过渡空镜（null），所有镜头都必须有 group_id
- gen_mode 全是 first_frame → 有动作的用 first_last_frame
- gen_mode 设为 multi_shot → Seedance 1.5 不支持
- 有台词但 audio_type 设为 none → 必须 generate_audio
