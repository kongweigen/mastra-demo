---
name: editing-patterns
description: 分镜/角色/场景编辑操作模式，批量修改策略、字段约束、常见用户意图映射
version: 1.0.0
---

# 编辑操作模式

## 适用场景

当用户要求修改分镜内容、调整角色设定、编辑场景描述时，加载此技能。

## 用户意图 → 工具映射

### 分镜编辑

| 用户说的话 | 实际操作 | 工具调用 |
|-----------|---------|---------|
| "修改第3镜的台词" | 更新 script_dialogue | `updateStoryboardField(id, "script_dialogue", value)` |
| "第5镜改成近景" | 更新 shot_type | `updateStoryboardField(id, "shot_type", "CLOSE_UP")` |
| "调整第2镜的画面描述" | 更新 visual_prompt | `updateStoryboardField(id, "visual_prompt", value)` |
| "在第3镜后面加一个镜头" | 插入分镜 | `insertStoryboard(episodeId, 3, dialogue, visualPrompt)` |
| "删掉第7镜" | 删除分镜 | `deleteStoryboard(storyboardId)` |
| "第4镜改成推镜头" | 更新 camera_movement | `updateStoryboardField(id, "camera_movement", "PUSH_IN")` |

### 角色编辑

| 用户说的话 | 实际操作 | 工具调用 |
|-----------|---------|---------|
| "把林枫改成25岁" | 更新 age | `updateCharacterField(id, "age", "25")` |
| "女主改名叫苏婉" | 更新 name | `updateCharacterField(id, "name", "苏婉")` |
| "调整男主的外貌描述" | 更新 visual_summary | `updateCharacterField(id, "visual_summary", value)` |

### 场景编辑

| 用户说的话 | 实际操作 | 工具调用 |
|-----------|---------|---------|
| "咖啡厅改成傍晚暖光" | 更新 environment_desc | `updateSceneField(id, "environment_desc", value)` |
| "更新办公室的画面描述" | 更新 visual_summary | `updateSceneField(id, "visual_summary", value)` |

## 字段约束

### 分镜字段 (updateStoryboardField)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| visual_prompt | String | 建议 50-200 字 | AI 生成图片/视频的画面描述 |
| script_dialogue | String | 无长度限制 | 该镜头的台词/旁白 |
| script_action | String | 无长度限制 | 该镜头的动作描述 |
| speaker | String | 角色名 | 台词说话者 |
| shot_type | Enum | CLOSE_UP/MEDIUM/WIDE/PANORAMA/ACTION | 镜头类型 |
| camera_movement | Enum | STATIC/PAN/PUSH_IN/PULL_OUT/FOLLOW/TILT | 运镜方式 |
| duration | Number | 3-10 秒 | 单镜头时长 |

### 角色字段 (updateCharacterField)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| name | String | 角色名称 |
| gender | String | 性别 (男/女) |
| age | String | 年龄 |
| role_type | String | 角色类型 (主角/配角/龙套) |
| visual_summary | String | 外貌描述 (影响 AI 生成一致性) |
| voice_instructions | String | 配音指导 (情感基调、语速等) |

### 场景字段 (updateSceneField)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| name | String | 场景名称 |
| environment_desc | String | 环境描述 (时间、天气、氛围) |
| visual_summary | String | 画面总结 (影响 AI 全景图生成) |

## 批量编辑策略

当用户要求批量修改（如"把所有近景改成中景"）：

1. **先查询**: `getStoryboards(episodeId)` 获取所有分镜
2. **筛选目标**: 根据条件筛选需要修改的分镜 ID
3. **逐个更新**: 对每个目标分镜调用 `updateStoryboardField`
4. **汇报结果**: 告知用户修改了哪几个分镜

## ID 解析

用户通常说"第 N 镜"而不是 storyboardId。处理流程：

1. `getStoryboards(episodeId)` 获取分镜列表
2. 找到 shotNo=N 的分镜，获取其 id
3. 用 id 调用编辑工具

如果用户没有指定 episodeId，先 `getEpisodes(projectId)` 确认集信息。

## 编辑后的建议

- 修改 visual_prompt 后 → 建议重新生成图片/视频
- 修改角色 visual_summary 后 → 建议重新生成设计图
- 修改场景 environment_desc 后 → 建议重新生成全景图
- 插入/删除分镜后 → 建议检查前后镜头衔接性

## 关键规则

1. **ID 转换**: 用户说"第 N 镜"时必须先查 storyboard 列表转换为实际 ID
2. **确认再改**: 批量操作前先告知用户将修改哪些内容，获得确认
3. **一次一字段**: updateXxxField 每次只改一个字段，多字段修改需多次调用
4. **回显结果**: 修改后回显新值，让用户确认
