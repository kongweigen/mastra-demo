---
name: character-extraction-skill
description: 角色提取规范，提取角色身份、外貌特征、关系网络
version: 1.0.0
---

# 角色提取规范

## 字段定义

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| name | 是 | String | 角色全名（如"林婉儿"而非"婉儿"或"林小姐"）|
| gender | 是 | String | MALE / FEMALE / UNKNOWN |
| age | 是 | String | 年龄或年龄段（如"25"、"中年"）|
| ethnicity | 是 | String | 人种/族裔外貌特征（如"东亚"、"东南亚"、"欧美"、"中东"），从角色姓名和故事背景推断 |
| role_type | | String | PROTAGONIST / ANTAGONIST / SUPPORTING / EXTRA |
| body_type | | String | 体型（如"纤细高挑"、"魁梧"、"肥胖"）|
| skin_tone | | String | 肤色（如"白皙"、"小麦色"）|
| face_features | | String | 面部特征（如"浓眉大眼"、"瓜子脸"）|
| hair_style | | String | 发型发色（如"黑色长发披肩"、"寸头"）|
| clothing | | String | 常见穿着（如"粉色睡衣"、"西装"）|
| accessories | | String | 配饰（如"金丝眼镜"、"珍珠耳钉"）|
| special_marks | | String | 特殊标记（如"左脸疤痕"、"手腕纹身"）|
| aliases | | List<String> | 剧本中该角色的其他称呼（如 ["二婶", "翠芬婶子"]）|
| relationships | | JSON | 与其他角色的关系 |

注意：不需要 visual_summary 字段，图片提示词由后续 PromptEngineer 根据外貌特征生成。

## 输出格式

```json
{
  "characters": [
    {
      "name": "林晚",
      "gender": "FEMALE",
      "age": "20",
      "ethnicity": "东亚",
      "role_type": "PROTAGONIST",
      "body_type": "纤细",
      "skin_tone": "白皙",
      "face_features": "大眼，面容清秀",
      "hair_style": "黑色长发，微乱",
      "clothing": "粉色睡衣",
      "accessories": "",
      "special_marks": "",
      "aliases": ["二婶", "翠芬"],
      "relationships": {"林母": "母亲", "林父": "父亲", "刘翠芬": "二婶（仇人）"}
    }
  ]
}
```

## 提取规则

- **记录别名**：角色在剧本中出现的其他称呼都要记录到 aliases（如"二婶"、"老张"、"林小姐"）
- **全名优先**：统一用全名，不用昵称/称谓（文中"二婶"→提取为"刘翠芬"）
- **外貌从文本提取**：只提取文本中明确描述的特征，未提及的留空
- **不编造**：缺失信息留空字符串，不要凭空补充（ethnicity 除外，必须从姓名和故事背景推断填写）
- **relationships 用 JSON**：`{"角色名": "关系"}`，关系从该角色视角描述
- **不遗漏**：有台词、有动作、被旁白描述的角色都要提取
- **不提取背景人物**："路人"、"群众"等无台词无关键动作的不提取
