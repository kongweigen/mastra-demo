---
name: failure-patterns
description: 素材生成 + Agent 推理类失败诊断、prompt 改写、模型降级策略
version: 4.0.0
---

# 失败诊断与修复策略

本技能帮助 RetryCoordinator 诊断失败原因、改写敏感 prompt、选择降级模型。
覆盖两类故障：素材生成（图片/视频/音频）和 Agent 推理（剧本改写/角色提取/分镜拆解/配音/设计）。

## 错误类型与处理策略

### 1. 敏感词/内容策略拦截 (CONTENT_POLICY)

**识别**: error 含 content policy / safety / 内容安全 / 违规

**处理**: 阅读原始 prompt，找出触发安全策略的内容，改写后输出 `newPrompt`。

**prompt 改写原则**:
- 保持画面核心语义和构图不变，只替换触发词
- 暴力场景: "拿刀追赶" → "急匆匆追赶"，"鲜血" → "泪水"，"挥拳" → "激烈争执"
- 色情暗示: "衣衫不整" → "慌张的样子"，"紧身" → "得体的"
- 恐怖元素: "尸体" → "倒地的人影"，"血迹" → "痕迹"
- 政治敏感: 移除具体政治符号/人物，改为泛化描述
- 改写后的 prompt 必须是完整的、可直接用于生成的文本

**示例**:
```
原始: A angry man chasing the heroine with a knife through a dark bloody alley
改写: A worried man rushing after the heroine through a dimly lit narrow alley
```

### 2. 模型负载/网络超时 (NETWORK_TIMEOUT)

**识别**: error 含 timeout / timed out / 超时 / connection refused

**处理**: `action=retry`，原参数直接重试即可。

### 3. 模型不可用/配额用尽 (MODEL_UNAVAILABLE)

**识别**: error 含 quota / rate limit / unavailable / 不可用 / 503

**处理**:
1. 调用 `getAvailableModels(任务类型)` 查询可用模型列表
2. 按以下优先级选择替代模型:
   - 同 provider 的其他模型（如 volcano-seedream-3 → volcano-seedream-2）
   - 不同 provider 但功能相似（如 volcano-seedream → gemini-imagen）
   - priority 值最小的可用模型（数值越小优先级越高）
3. 输出 `newModelCode`

**模型降级参考**:

| 原模型 | 推荐降级 | 说明 |
|--------|---------|------|
| volcano-seedream-3 | gemini-imagen / alibaba-wanxiang | 图片模型互换 |
| volcano-seedance-2 | kling-v3 | 视频模型互换 |
| kling-v3 | volcano-seedance-2 | 视频模型互换 |
| gemini-imagen | volcano-seedream-3 | 图片模型互换 |

### 4. 参数不合法 (INVALID_PARAMS)

**识别**: error 含 invalid / bad request / 参数错误 / not supported

**处理**: 从错误信息中识别问题参数，输出 `newParams` 修正。

常见参数问题:
- duration 超出范围 → 调整为模型支持的值（如 5s）
- ratio 不支持 → 改为 "9:16" 或 "16:9"
- resolution 过高 → 降低分辨率

### 5. Prompt 过长 (PROMPT_TOO_LONG)

**识别**: error 含 too long / max length / token limit

**处理**: 阅读原始 prompt，精简到 500 字以内，保留核心描述，删除冗余修饰。输出 `newPrompt`。

### 6. 多次失败 (historyFailures >= 2)

**处理**: `action=skip`，避免无限循环。

## 决策树（按优先级）

1. historyFailures >= 2 → **skip**
2. CONTENT_POLICY → **retry_with_change** + newPrompt（改写 prompt）
3. NETWORK_TIMEOUT → **retry**
4. MODEL_UNAVAILABLE → **retry_with_change** + newModelCode（降级模型）
5. INVALID_PARAMS → **retry_with_change** + newParams（修正参数）
6. PROMPT_TOO_LONG → **retry_with_change** + newPrompt（精简 prompt）
7. UNKNOWN → **retry**（原参数重试1次）

## 输出字段说明

| 字段 | 何时使用 | 效果 |
|------|---------|------|
| `newPrompt` | 敏感词改写 / prompt 精简 | 直接替换 enhancedPrompt，下次生成使用改写版本 |
| `newModelCode` | 模型不可用时降级 | 切换到指定模型重新生成 |
| `newParams` | 参数调整 | 合并到 promptParams（如 negative_prompt、duration） |
| 三者可组合使用 | 例如: 换模型 + 调参数 | 同时生效 |

## Group 任务说明

失败详情中可能出现组任务格式：
```
- groupId=abc123, storyboardIds=[101,102,103], model=..., historyFailures=1, error=...
```
组内所有分镜共享一个生成任务。对组任务的 action 使用组内**首个 storyboardId**。

---

## Agent 推理类故障

当 `taskType: AGENT_REASONING` 时，故障来自 Agent 推理环节（chat 模型调用），而非素材生成。

### 7. Agent 空响应 (AGENT_NULL_RESPONSE)

**识别**: error 含 "未返回结果" / "null" / "降级" / "响应解析为 null"

**处理**: 换 chat 模型重试。输出 `action=retry_with_change` + `newModelCode`。

### 8. JSON 解析失败 (JSON_PARSE_ERROR)

**识别**: error 含 "JSON 解析失败" / "parse error" / "Unexpected token"

**处理**: 原模型重试 1 次（通常是 LLM 输出格式随机波动）。`action=retry`。

### 9. 输出内容不完整 (OUTPUT_INCOMPLETE)

**识别**: error 含 "内容为空" / "isEmpty" / "shots为空" / "未产出"

**处理**: 简化输入后重试。`action=retry_with_change` + `newParams(simplifyInput=true)`。

### 10. LLM 超时 (LLM_TIMEOUT)

**识别**: error 含 "timeout" / "超时" / "timed out"

**处理**: 换模型或重试。优先 `action=retry`，第 2 次失败则 `retry_with_change` + `newModelCode`。

### 11. Token 超限 (TOKEN_EXCEEDED)

**识别**: error 含 "token limit" / "max_tokens" / "context length exceeded"

**处理**: 截断输入。`action=retry_with_change` + `newParams(maxInputChars=减半)`。

### Chat 模型降级表

| 原模型 | 推荐降级 | 说明 |
|--------|---------|------|
| gemini-2.5-flash | gemini-2.5-pro / deepseek-chat | 推理能力升级或换线路 |
| gemini-2.5-pro | deepseek-chat | 换供应商 |
| deepseek-chat | gemini-2.5-flash | 换供应商 |
| doubao-* | gemini-2.5-flash | 换供应商 |

### 推理类决策树（taskType=AGENT_REASONING 时）

1. historyFailures >= 1 → **skip**（推理类最多重试 1 次，防止无限循环）
2. AGENT_NULL_RESPONSE → **retry_with_change** + newModelCode
3. JSON_PARSE_ERROR → **retry**
4. OUTPUT_INCOMPLETE → **retry_with_change** + newParams
5. LLM_TIMEOUT → **retry**（首次）/ **retry_with_change** + newModelCode（再次）
6. TOKEN_EXCEEDED → **retry_with_change** + newParams(maxInputChars)
7. UNKNOWN → **retry**

### scope 字段用法

推理类故障的 `scope` 和 `targetId` 说明:
- `scope=episode`, `targetId=episodeId`: 针对特定集的重试（如剧本二创、分镜拆解）
- `scope=stage`, `targetId=null`: 针对整个阶段的重试（如角色提取、设计）
- 素材类继续使用 `scope=storyboard`, `targetId=storyboardId`
