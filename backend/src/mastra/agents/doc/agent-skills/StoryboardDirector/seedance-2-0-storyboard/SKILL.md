---
name: seedance-2-0-storyboard
description: Seedance 2.0 分镜规范（15s多镜头 + 多模态参考 + 原生音频）
model_match:
  - doubao-seedance-2
  - seedance-2
version: 5.0.0
---

# Seedance 2.0 分镜规范

## 模型能力

- 单次生成最长 15 秒
- 多模态输入: 角色参考图、场景参考图、参考音频、参考视频
- 原生音视频同步（generate_audio）
- 支持首尾帧控制（first_last_frame）

## 拆分步骤

### 第 1 步: 拆镜头

一个镜头只做一件事（一个动作/一句台词/一个反应）。

镜头密度:
- 200字 -> 至少 8 镜头
- 500字 -> 至少 16 镜头
- 1000字 -> 至少 32 镜头

对话拆分:
- 一个镜头只有一个说话者
- 不同角色对话拆成不同镜头
- 长台词（>20字）拆为两个镜头

必须有的镜头:
- 场景建立镜头（全景，交代人物站位和空间关系）
- 角色反应镜头
- 动作特写
- 场景切换过渡

### 第 2 步: 决定 gen_mode

- first_frame: 有参考图的镜头（默认）
- first_last_frame: 角色位置/状态明显变化的镜头
- 不使用 multi_shot（Seedance 不支持）

### 第 3 步: 分组（拉满 15 秒）

同组镜头由后端合并为一条多镜头 prompt，一次 API 调用生成 15 秒视频。

分组和时长必须同时考虑，确保每组总和不超过 15 秒。

分组规则:
1. 同场景连续镜头 -> 同组
2. 场景切换 -> 必须新开一组
3. 边分组边累加时长，累加到 15 秒就新开一组
4. 组内 group_index 从 0 递增
5. 保证每组内的剧情是连贯的

分组+时长的正确做法:
```
第1步: 先拆出所有镜头并估算每个镜头的时长
第2步: 从第一个镜头开始累加，当累加值接近15s时切分一组
  镜头1(3s) + 镜头2(3s) + 镜头3(2s) + 镜头4(3s) + 镜头5(4s) = 15s -> g1
  镜头6(3s) + 镜头7(3s) + 镜头8(2s) + 镜头9(3s) + 镜头10(3s) = 14s -> g2
  ...
```

错误示范:
```
把 9 个镜头塞进一组，每个 5 秒 = 45 秒 -> 严重超时!
```

时长参考:
| 场景 | 时长 |
|------|------|
| 快速反应/表情变化 | 1-2s |
| 无台词动作 | 2-3s |
| 短台词（1-10字） | 2-3s |
| 中等台词（11-20字） | 3-4s |
| 超过 20 字 | 拆为两个镜头 |

重要:
- 3 秒能完成的动作不要给 5 秒，否则视频会出现慢动作
- 大部分镜头应该是 2-3 秒，不是 4-5 秒
- 所有镜头都必须有 group_id，不允许 null

### 第 5 步: 设定景别

推荐交替: WIDE -> CLOSE_UP -> MEDIUM -> CLOSE_UP -> WIDE
- 每组开头用 WIDE/MEDIUM 建立空间和人物站位
- 连续 CLOSE_UP 不超过 3 个
- 多人场景描述清楚站位关系（"角色A在画面左侧，角色B在右侧"）

## visual_prompt 规范

只描述镜头中发生的具体内容:
- 人物动作、表情、姿态
- 场景环境细节
- 多人场景写清楚人物相对位置和朝向

不写: "图片N""音频N"引用（由 PromptEngineer 处理）
不写: 运镜、色调、构图（由 PromptEngineer 处理）

多人场景站位技巧:
- 首个镜头用全景建立站位（谁在左谁在右）
- 后续镜头保持一致的空间关系
- 如有新角色入场，明确描述从哪个方向进入

## 原生音频

Seedance 2.0 的 generate_audio 可以同时处理角色对话和旁白:
- 角色对话: audio_type = generate_audio
- 旁白/叙述者: audio_type = generate_audio（Seedance 2.0 可以用旁白音色原生生成）
- 无台词空镜: audio_type = none
- 每个镜头只有一个 speaker

## 案例

### g1 组（5 镜头，总时长 15s）

```json
[
  {
    "group_id": "g1", "group_index": 0,
    "dialogue": "", "speaker": "",
    "action": "林家卧室全景建立",
    "visual_prompt": "昏暗的林家卧室，墙角堆着几袋粮食，油灯微弱的光照亮破旧的窗户。林晚蜷缩在床角，二婶站在门口。",
    "shot_type": "WIDE", "camera_movement": "static", "duration": 3,
    "characters": ["林晚", "二婶"], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "none", "voices": [], "emotion": "tense",
    "need_shot_image": true, "need_character_ref": true, "need_scene_ref": true
  },
  {
    "group_id": "g1", "group_index": 1,
    "dialogue": "把粮食交出来！",
    "speaker": "二婶",
    "action": "二婶推门闯入",
    "visual_prompt": "二婶一把推开门冲进来，手指着林晚的鼻子，表情凶狠",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 3,
    "characters": ["二婶", "林晚"], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "generate_audio", "voices": ["二婶"], "emotion": "angry",
    "need_shot_image": false, "need_character_ref": false, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 2,
    "dialogue": "", "speaker": "",
    "action": "林晚震惊反应",
    "visual_prompt": "林晚瞪大双眼，不自觉地后退半步",
    "shot_type": "CLOSE_UP", "camera_movement": "static", "duration": 2,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "none", "voices": [], "emotion": "surprised",
    "need_shot_image": false, "need_character_ref": false, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 3,
    "dialogue": "这是我们家的，你凭什么抢？",
    "speaker": "林晚",
    "action": "林晚挡住粮食",
    "visual_prompt": "林晚双手张开挡在粮食袋前，眼神坚定，嘴唇微微发抖",
    "shot_type": "MEDIUM", "camera_movement": "dolly in", "duration": 4,
    "characters": ["林晚"], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "generate_audio", "voices": ["林晚"], "emotion": "determined",
    "need_shot_image": false, "need_character_ref": false, "need_scene_ref": false
  },
  {
    "group_id": "g1", "group_index": 4,
    "dialogue": "",
    "speaker": "旁白",
    "action": "旁白过渡",
    "visual_prompt": "二婶和林晚僵持对峙，油灯的火苗在两人之间摇曳",
    "shot_type": "MEDIUM", "camera_movement": "static", "duration": 3,
    "characters": ["二婶", "林晚"], "scene": "林家卧室",
    "gen_mode": "first_frame", "audio_type": "generate_audio", "voices": [], "emotion": "tense",
    "need_shot_image": false, "need_character_ref": false, "need_scene_ref": false
  }
]
```

## 自检清单

1. 逐组验算: 把每组所有镜头的 duration 加起来，确认 <= 15 秒（这是最重要的检查）
2. 镜头数够不够? 500字至少 16 个
3. 所有镜头都有 group_id?
4. 大部分镜头 duration 是 2-3 秒? （如果很多 4-5 秒说明太长了）
5. 每组内剧情是否连贯?
6. 有动作变化的镜头是否用了 first_last_frame
7. 每个镜头只有一个 speaker
8. 角色对话和旁白 audio_type 都是 generate_audio
9. 无台词空镜 audio_type 是 none
10. 每组第一个镜头是否用全景建立站位

## 常见错误

- 7个镜头每个5秒=35秒 -> 严重超时! 要么减少镜头数，要么缩短每个镜头到2-3秒
- 一组超过 15 秒 -> 必须拆分，不允许例外
- 一组只有 8 秒 -> 凑到 15s，增加镜头或加长时长
- 所有镜头都是 4-5 秒 -> 太长太均匀，应该有 2-3 秒的快切镜头
- gen_mode 设为 multi_shot -> Seedance 不支持
- 旁白 audio_type 设为 none -> Seedance 2.0 旁白也用 generate_audio
- visual_prompt 写"图片1" -> 不写引用
- 所有镜头相同时长 -> 应有节奏变化（快切+慢镜交替）
- 多人场景没有建立站位 -> 每组首个镜头用全景交代
- group_id 为 null -> 所有镜头都必须有 group_id
