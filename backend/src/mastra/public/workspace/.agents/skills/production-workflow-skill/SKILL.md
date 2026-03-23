---
name: production-workflow-skill
description: AI短剧生产全流程指南，DAG阶段顺序、模型适配、前置条件、产出物
version: 2.0.0
---

# AI短剧生产全流程

## 适用场景

当用户问"接下来该做什么"、"流程是什么"、项目卡在某阶段时，加载此技能。

## 两个维度的"风格"

| 维度 | 来源 | 示例 | 用途 |
|------|------|------|------|
| **画风** (art style) | 用户创建项目时选择 | 写实/动漫/水墨/油画 | 控制渲染方式和画面质感 |
| **内容风格** (content style) | StyleAnalyzer Agent 从小说中提取 | 末日冰灾/甜宠校园/悬疑推理 | 控制色调、氛围、光影、环境基调 |

两者都会传给 PromptEngineer，共同影响图片和视频提示词生成。

## DAG 生产流程 (按模型适配)

```
模型选择 -> 风格分析 -> [剧本改写] -> 角色+场景提取(并行) -> 音色分配 -> 音色文件生成
-> 分镜拆解 -> [设计图提示词->设计图] -> [镜头图提示词->镜头图+音频(并行)]
-> 视频提示词 -> 视频生成 -> 视频合成 -> 视频拼接
```

方括号 [] 表示按模型 Profile 可选的阶段。

### 不同视频模型的流程差异

| 阶段 | Kling V3 Omni | Seedance 2.0 | Seedance 1.5 |
|------|--------------|-------------|-------------|
| 镜头图 | 宫格图(整图传入) | 不需要(参考图直传) | 宫格图(裁剪首帧) |
| 视频提示词 | 组级时间线 | 逐镜头 | 逐镜头 |
| 视频生成 | 一组一个视频 | 逐镜头视频 | 逐镜头视频 |
| 音频 | 内置音色(旁白需TTS) | 参考音频(视频自带) | 独立TTS |

### Step 0: 风格分析 (StyleAnalyzer) - 自动

| 项目 | 说明 |
|------|------|
| 触发 | DAG 自动执行，用户也可手动委派 delegate_style_analysis |
| 输入 | 项目原始内容(dm_project_source)前5000字 |
| 产出物 | project.contentStyle |
| 已有则跳过 | contentStyle 非空时自动跳过 |

### Step 1: 剧本改写 (ScriptWriter)

| 项目 | 说明 |
|------|------|
| 前置条件 | 分集内容已导入 |
| 调用工具 | delegate_script_rewrite |
| 模式 | RECREATE_FIRST_PERSON / RECREATE_THIRD_PERSON / RECREATE_POLISH |
| 产出物 | episode.recreatedContent + emotionCurve |

### Step 2: 角色场景提取 (CharacterSceneExtractor)

| 项目 | 说明 |
|------|------|
| 前置条件 | 剧本改写完成 |
| 调用工具 | delegate_character_extraction |
| 产出物 | 角色(含外貌、音色、别名) + 场景(含环境、时间) |

### Step 3: 音色分配 (VoiceDirector)

| 项目 | 说明 |
|------|------|
| 前置条件 | 角色已提取 |
| 调用工具 | delegate_voice_assignment |
| 音频策略 | voice_builtin / reference_audio / external_tts |

### Step 4: 分镜拆解 (StoryboardDirector)

| 项目 | 说明 |
|------|------|
| 前置条件 | 改写+角色+场景+音色 |
| 调用工具 | delegate_storyboard_breakdown |
| 模型适配 | Agent 通过 SkillBox 自动加载模型专属 Skill |

### Step 5: 提示词 + 素材生成

| 项目 | 说明 |
|------|------|
| 调用工具 | delegate_prompt_engineering |
| 提示词类型 | PROMPT_DESIGN(设计图) / PROMPT_IMAGE(镜头图) / PROMPT_VIDEO(视频) |

### Step 6: 视频合成 + 拼接

| 项目 | 说明 |
|------|------|
| 调用工具 | synthesizeEpisode(episodeId) |
| 处理 | 混音 + 字幕烧录 + BGM + 拼接 |

## 阶段诊断

| 用户想做 | 需要检查 | 引导 |
|---------|---------|------|
| 分析风格 | project_source 有内容 | 先导入小说 |
| 改写剧本 | episode.content 非空 | 先导入内容 |
| 提取角色 | recreatedContent 非空 | 先改写剧本 |
| 生成视频 | 有图片/提示词 | 先生成镜头图和视频提示词 |

## 关键规则

1. 不要跳步，每个步骤的前置条件必须满足
2. 画风 vs 内容风格: 用户说"换风格"时要确认是换画风还是重新分析内容风格
3. 模型适配: 不同视频模型的流程差异很大，注意 Profile 驱动的阶段开关
