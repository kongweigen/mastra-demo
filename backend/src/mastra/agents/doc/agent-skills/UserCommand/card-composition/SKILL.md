---
name: card-composition
description: 结构化卡片响应组装指南，何时使用哪种卡片类型、字段填充规则、action 按钮设计
version: 1.0.0
---

# 结构化卡片响应组装

## 适用场景

当你需要返回包含卡片、操作按钮或建议的富文本响应时，加载此技能。

## 卡片类型与触发条件

| 卡片类型 | type 值 | 触发时机 | 必填字段 |
|---------|---------|---------|---------|
| 生产概览 | `production_summary` | 调用任何 dispatch 工具后、用户问"项目状态" | name, title, summary, characterCount, sceneCount, shotCount |
| 角色卡 | `character` | 角色提取/查询完成 | name, role, description |
| 任务进度 | `task_progress` | 异步任务提交后 | name, status, taskId |
| 剧本摘要 | `script_summary` | 剧本改写完成 | name, content |
| 项目配置 | `project_config` | 创建项目后（**系统自动生成，你不需要填充**） | — |

**重要**: 创建项目后（调用 createProject/createProjectByNovelName），不要自己生成任何 cards。系统会自动附加 `project_config` 卡片展示项目配置信息。你只需在 text 中说明项目已创建即可。

## production_summary 字段填充规则

**必须先调用 ObservationTools 查询真实数据**，不要凭记忆填充。

```
1. getProjectStatus(projectId) → 获取角色数/场景数/分集数/分镜总数/阶段
2. getCharacters(projectId) → 获取角色名列表，拼入 summary
3. getScenes(projectId) → 获取场景名列表，拼入 summary
```

字段组装：

| 字段 | 来源 | 示例 |
|------|------|------|
| name | 项目名称 | "都市逆袭：命运逆转" |
| title | 当前操作描述 | "视频分镜" / "剧本改写" / "角色提取" |
| category | 操作分类标签 | "AI短剧" / "分镜拆解" / "剧本创作" |
| summary | 角色+场景名称组合 | "主角：林枫(男主)、苏婉(女主)；场景：都市街头、豪华办公室" |
| characterCount | getProjectStatus 返回值 | 5 |
| sceneCount | getProjectStatus 返回值 | 3 |
| shotCount | getProjectStatus 返回值 | 24 |
| episodeCount | getProjectStatus 返回值 | 3 |
| duration | shotCount × 4 秒，格式 "MM:SS" | "01:36" |
| styleLabel | 风格标签 | "都市" / "古装" / "悬疑" |

## action 按钮设计

### 三种 action 类型

| type | 用途 | 关键字段 |
|------|------|---------|
| `modal` | 打开 Studio 面板 Tab | `step`: 1=改写, 2=提取, 3=素材, 4=合成 |
| `command` | 自动发送指令到 Chat | `command`: 用户点击后自动填充并发送的文本 |
| `navigate` | 页面跳转 | `url`: URL 路径 |

### 场景→按钮映射

- **剧本改写完成** → `[{label:"查看剧本", type:"modal", step:1}, {label:"提取角色场景", type:"command", command:"提取角色和场景"}]`
- **角色场景提取完成** → `[{label:"查看角色场景", type:"modal", step:2}, {label:"开始分镜拆解", type:"command", command:"拆解分镜"}]`
- **分镜拆解完成** → `[{label:"查看分镜", type:"modal", step:2}, {label:"生成分镜图片", type:"command", command:"请生成分镜图片"}]`
- **分镜图片生成后** → `[{label:"查看素材", type:"modal", step:3}, {label:"生成配音", type:"command", command:"请批量生成配音"}]` (图片和配音可并行)
- **配音生成后** → `[{label:"查看素材", type:"modal", step:3}, {label:"生成分镜视频", type:"command", command:"请生成分镜视频"}]`
- **视频生成后** → `[{label:"查看素材", type:"modal", step:3}, {label:"合成视频", type:"command", command:"请合成视频"}]`
- **查询类** → `[{label:"查看详情", type:"modal", step:1}]`

**素材生成顺序**: 图片+配音(可并行) → 视频 → 合成。音频(TTS)只依赖剧本文本，与图片互不依赖。

## suggestion 建议语

在 `suggestion` 字段给出下一步操作提示，引导用户继续流程：

- 剧本改写后 → "接下来可以提取角色和场景，或先查看剧本效果"
- 角色提取后 → "角色和场景已就绪，可以开始拆解分镜了"
- 分镜拆解后 → "分镜已拆解完成，可以生成分镜图片"
- 图片生成后 → "可以同时生成配音，图片和音频互不依赖"
- 配音生成后 → "配音已提交，接下来可以生成分镜视频"
- 视频生成后 → "视频生成任务已提交，完成后即可合成最终视频"
- 项目状态查询 → 根据当前阶段给出对应建议

## 关键规则

1. **数据真实性**: 所有数字必须来自 ObservationTools 查询结果，禁止编造
2. **卡片精简**: 一条响应最多 2 张卡片，避免信息过载
3. **按钮最多 3 个**: 超过 3 个按钮用户会选择困难
4. **suggestion 必填**: 每条响应都应给出下一步建议
