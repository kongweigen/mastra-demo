---
name: voice-character-matching
description: 角色音色匹配决策指南，按项目配置模型查询音色
version: 1.0.0
---

# 角色音色匹配决策指南

## 第一步：查询项目配置模型的音色

用户消息中已告知项目配置的具体模型 code，直接用 `getModelDetail(modelCode)` 查询该模型的 voices 列表。

### 模式 A: voice_builtin（视频模型内置音色）

用户消息中会给出两个模型 code：
- **角色对话用视频模型**: 如 `kling-v3-omni` → 调用 `getModelDetail('kling-v3-omni')` 获取内置音色
- **旁白用TTS模型**: 如 `alibaba-qwen3-tts-instruct` → 调用 `getModelDetail('alibaba-qwen3-tts-instruct')` 获取TTS音色

角色的 voiceId 从视频模型的 voices 中选，ttsModel 填视频模型的 modelCode。
旁白的 voiceId 从 TTS 模型的 voices 中选，ttsModel 填 TTS 模型的 modelCode。

### 模式 B: TTS（独立音频模型）

用户消息中会给出一个 TTS 模型 code → 调用 `getModelDetail(modelCode)` 获取音色。
角色和旁白都从这个 TTS 模型的 voices 中选。

## 差异化原则（最重要）

短剧中多个角色同时对话时，观众靠**音色差异**区分说话人：

- **同性别角色之间音色差异明显**：不要给两个女性角色都选"温柔"类音色
- **对立角色选对比音色**：女主(温柔) vs 女反派(强势/冷漠)，男主(阳光) vs 男反派(沙哑/阴沉)
- **年龄差拉开**：长辈选沉稳音色，晚辈选年轻音色
- **旁白与角色有区分**：旁白用播音风格，不要和任何角色音色重复
- **第一人称旁白匹配主角**：如果剧本是第一人称叙述（"我"视角），旁白音色必须匹配主角性别（女主角→女声旁白，男主角→男声旁白），因为旁白就是主角在讲述

## instruct 模型 instructions 写法

instructions 是**角色基础声线描述**（不变的），只有 instruct 类 TTS 模型生效。
系统在 TTS 生成时会自动叠加分镜的情绪，所以 instructions 只写声线特征。

好的写法：
- "声音低沉有磁性，语速偏慢，沉稳有力"
- "声音清脆甜美，语调微微上扬，自带笑意"
- "嗓音沙哑浑厚，有烟嗓质感，沧桑中带温暖"

不好的写法：
- ~~"愤怒地说话"~~ → 情绪由分镜决定

## 模型选择策略

| 角色重要性 | 推荐 | 理由 |
|-----------|------|------|
| 主角 | instruct 模型 + instructions | 台词多，需要精细控制 |
| 反派 | instruct 模型 + instructions | 需要鲜明对比 |
| 配角 | flash 模型即可 | 台词少 |
| 旁白 | instruct 模型 | 全剧贯穿 |

注意：voice_builtin 模式下角色不需要 ttsModel/instructions（视频模型内置音色不支持），只需要 voiceId。

## 输出格式

### voice_builtin 模式

```json
{
  "characterVoices": {
    "10001": {
      "ttsModel": "kling-v3-omni",
      "voiceId": "863535442560978963",
      "reasoning": "女主温柔型，选'女 温柔女生'内置音色"
    },
    "10002": {
      "ttsModel": "kling-v3-omni",
      "voiceId": "863535593908088867",
      "reasoning": "男反派，选'男 反派角色'内置音色"
    }
  },
  "narratorVoice": {
    "ttsModel": "alibaba-qwen3-tts-instruct",
    "voiceId": "Neil",
    "instructions": "字正腔圆，沉稳客观的播音风格",
    "reasoning": "旁白用TTS模型，选Neil播音风格"
  }
}
```

### TTS 模式

```json
{
  "characterVoices": {
    "10001": {
      "ttsModel": "alibaba-qwen3-tts-instruct",
      "voiceId": "Ethan",
      "instructions": "声音温暖有磁性，语速适中",
      "reasoning": "男主角25岁阳光型"
    }
  },
  "narratorVoice": {
    "ttsModel": "alibaba-qwen3-tts-instruct",
    "voiceId": "Neil",
    "instructions": "字正腔圆，沉稳客观",
    "reasoning": "旁白需要稳重清晰"
  }
}
```

voiceId 和 ttsModel 必须来自 getModelDetail 返回的实际数据，禁止编造。
