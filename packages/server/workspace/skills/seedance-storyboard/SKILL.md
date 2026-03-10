---
name: seedance-storyboard
description: Seedance 2.0 分镜技能：根据导演讲戏和服化道素材生成动态视频提示词
---

# Seedance 2.0 分镜编写技能

[技能说明]
    将导演的讲戏内容转化为 Seedance 2.0 格式的动态视频提示词。
    每个剧情点 = 一集完整叙事（90-120秒）= 多个分镜 = 多个 Seedance 2.0 提示词。
    分镜师从导演讲戏本中读取分镜拆分列表，为每个分镜编写独立的 Seedance 2.0 提示词。
    每个分镜 8-15 秒，可独立生成。提示词中使用 @引用语法关联人物和场景素材，输出可直接复制到 Seedance 2.0 平台生成视频。

[执行流程]

    第一步：读取上游产物
        - 读取导演讲戏本（01-director-analysis.md）
        - 读取人物提示词（assets/character-prompts.md）
        - 读取场景道具提示词（assets/scene-prompts.md）

    第二步：建立素材对应表
        - 根据人物和场景提示词文件，为本集涉及的素材分配 @引用编号
        - 只有在 character-prompts.md 和 scene-prompts.md 中有提示词的人物/场景才分配 @引用
        - 不在素材文件中的人物（群演、一次性配角）不进对应表，在提示词中直接用文字描述

    第三步：提取分镜列表
        从导演讲戏本中读取每个剧情点的分镜拆分信息：
        - 分镜数量（6-10 个/集）
        - 每个分镜的场景、人物、动作要点、时长

    第四步：为每个分镜编写 Seedance 2.0 提示词
        从导演阐述中提取并转化：
        - 运镜：导演描述的镜头运动 → Seedance 运镜语言
        - 动作：导演描述的人物动作 → 具体物理动作描述
        - 台词/声音：导演描述的对白 → 角色语音/旁白/环境音
        - 光影：导演描述的光影氛围 → 光线/色调/氛围描述
        - 节奏：导演描述的情绪节奏 → 运动速度/剪辑节奏

        每个分镜生成一条独立的 Seedance 2.0 提示词。

[Seedance 2.0 提示词写法核心规则]

    叙事描述式
        - 用完整的导演式段落描述，不要关键词堆叠
        - Seedance 2.0 擅长理解长段叙事性提示词

[强制 JSON 输出格式]
    你的最终输出必须是一个严格的 JSON 对象，不要包含任何 markdown 代码块标记。
    输出格式如下：

    {
      "assetMapping": [
        {
          "assetId": "@001",
          "type": "character",
          "name": "角色名"
        }
      ],
      "shots": [
        {
          "shotNumber": 1,
          "scene": "场景名",
          "characters": "出现的角色名",
          "cameraAngle": "镜头角度描述",
          "cameraMovement": "镜头运动描述",
          "actionDescription": "具体动作描述",
          "duration": 10,
          "seedancePrompt": "完整的 Seedance 2.0 叙事性提示词"
        }
      ]
    }

    要求：
    1) 必须输出纯 JSON 对象，不要有 ```json 或 ``` 等标记
    2) 字段名必须完全匹配，不要有额外字段
    3) 所有字符串值不能为空，如无内容请使用空字符串 ""
    4) assetId 使用 @001, @002 等格式编号
    5) shotNumber 从 1 开始连续编号
    6) duration 单位为秒，范围 8-15 秒
    7) seedancePrompt 必须使用叙事描述式，包含运镜、动作、台词/声音、光影、节奏
