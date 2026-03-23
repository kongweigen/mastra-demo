---
name: video-kling-v3-omni
description: Kling Omni 视频 Prompt 工程规范（element 主体 + image 宫格图 + 时间线格式）
model_match:
  - kling-v3-omni
  - kling-video-o1
  - omni
version: 4.0.0
---

# Kling Omni 视频 Prompt 工程规范

## 生成方式

每个镜头的视频由三部分驱动：
- element_list: 角色主体（锁定外貌+音色）
- image_list: 宫格参考图（提供画面构图参考）
- prompt: 时间线格式的动作+台词+音效描述

后端自动传入 element_list 和 image_list，PromptEngineer 只需要写 prompt。

## 硬性限制

- 总 prompt 不超过 2000 字符
- 所有提示词使用中文
- 必须有动作过程，不能是静态描述

## 时间线 Prompt 格式

每段用 [MM:SS - MM:SS] + 景别 + 描述的结构：

```
[00:00 - 00:04] 中景：
<<<element_1>>>推开门冲进来，手指着<<<element_2>>>，表情凶狠，脚步急促。
Audio：门被大力推开的碰撞声，急促的脚步声。

[00:04 - 00:08] 特写：
<<<element_2>>>瞪大眼睛，不自觉后退一步，双手护在身后粮食袋前。
Audio：急促的呼吸声，衣服摩擦声。

[00:08 - 00:12] 中景：
<<<element_1>>>一把推开<<<element_2>>>，<<<element_2>>>踉跄后退撞到墙上，粮食袋散落。
<<<element_1>>>："少废话，村长说了这是公家的！"
Audio：推搡碰撞声，粮食袋落地的沉闷声。

<<<image_1>>>
```

## 格式规则

### 时间标记
- 格式：[MM:SS - MM:SS]
- 从 [00:00] 开始，按分镜 duration 递增
- 示例：4 秒镜头 → [00:00 - 00:04]，下一个 → [00:04 - 00:08]

### 景别（紧跟时间标记后）
- 中景、特写、全景、远景、动作镜头
- 用中文，后面加冒号

### 角色引用 <<<element_N>>>
- <<<element_1>>> 对应 element_list 中第 1 个角色主体
- 角色外貌不需要描述（主体已锁定）
- 同一角色在不同段用相同编号
- 编号对应 getStoryboardDetails 返回的 boundCharacters 顺序

### 台词（仅角色对话）
- 只有角色说话时才写台词：<<<element_N>>>："台词内容"
- 主体绑定了音色，模型自动生成口型和语音
- 旁白/叙述者的台词不要写进 prompt（旁白由独立 TTS 生成，合成时混入）
- 如果镜头只有旁白没有角色说话，prompt 中只写画面动作，不写任何台词

### 音效 Audio
- 每段末尾用 Audio: 描述环境音
- 简洁具体：推门声、脚步声、风声、呼吸声
- 可选，无特殊音效时省略

### 宫格参考图 <<<image_1>>>
- 放在整个 prompt 的最末尾，单独一行
- 只出现一次，不要在每段都重复
- 提供整组的场景和构图参考

## 完整示例

组内 3 个镜头（4s + 4s + 4s = 12s）：

```
[00:00 - 00:04] 全景：
昏暗的林家卧室，墙角堆着几袋粮食，油灯微弱的光照亮破旧的窗户。门突然被大力推开。
Audio：狂风呼啸声，木门被猛力推开的碰撞声。

[00:04 - 00:08] 中景：
<<<element_1>>>冲进来，手指着<<<element_2>>>的鼻子。
<<<element_1>>>："把粮食交出来！"
Audio：急促的脚步声，凶狠的喝令声。

[00:08 - 00:12] 特写：
<<<element_2>>>瞪大眼睛，不自觉后退一步，双手紧紧护住身后的粮食袋，嘴唇微微发抖。
Audio：急促的呼吸声，衣物摩擦声。

<<<image_1>>>
```

旁白镜头的正确写法（不写台词）：
```
[00:00 - 00:04] 全景：
零下八十度的暴风雪中，几个模糊人影在疯狂抢夺物资，煤块散落雪地。
Audio：狂风呼啸声，重物撞击声。
```
注意：旁白台词"最让我胆寒的不是风雪而是人心"不写进 prompt，由独立 TTS 生成。

角色对话镜头的正确写法（写台词+指定element）：
```
[00:04 - 00:08] 中景：
<<<element_1>>>冲进来指着<<<element_2>>>。
<<<element_1>>>："把粮食交出来！"
Audio：急促脚步声。
```

## promptParams

```json
{
  "duration": 4,
  "ratio": "9:16"
}
```

## 输出格式

输出一条完整的组视频 prompt，包含所有镜头的时间线，可直接传给视频模型 API。
prompts 数组只有一个元素，storyboardId 填第一个分镜 ID。

```json
{
  "prompts": [
    {
      "storyboardId": 100,
      "engineeredPrompt": "[00:00 - 00:04] 全景：\n昏暗的林家卧室，门突然被大力推开。\nAudio：木门碰撞声，狂风声。\n\n[00:04 - 00:08] 中景：\n<<<element_1>>>冲进来，手指着<<<element_2>>>。\n<<<element_1>>>：\"把粮食交出来！\"\nAudio：急促脚步声。\n\n[00:08 - 00:12] 特写：\n<<<element_2>>>后退，双手护住粮食袋。\nAudio：急促呼吸声。\n\n<<<image_1>>>",
      "negativePrompt": "模糊, 面部变形, 低质量, 水印",
      "promptParams": {"duration": 12, "ratio": "9:16"}
    }
  ],
  "summary": "生成了1条组视频时间线 prompt，12s"
}
```

promptParams.duration 是整组总时长（所有镜头 duration 之和）。

## 关键规则

- 直接输出完整可用的时间线 prompt（后端直接透传给 API，不再拼接）
- 有 element 时必须用 <<<element_N>>> 引用，禁止描述角色外貌
- 时间标记格式 [MM:SS - MM:SS]，从 [00:00] 开始
- <<<image_1>>> 放在整个 prompt 最末尾，单独一行
- 台词格式：<<<element_N>>>："台词"
- Audio 音效简洁具体
- 整条 prompt 控制在 2000 字符内
