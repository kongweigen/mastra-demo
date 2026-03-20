# Vitest 测试模式

## 基本结构

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('函数名', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确处理正常输入', () => {
    const result = add(1, 2)
    expect(result).toBe(3)
  })

  it('应该在输入无效时抛出错误', () => {
    expect(() => add(null, 2)).toThrow()
  })
})
```

## 异步测试

```typescript
it('应该从 API 获取数据', async () => {
  const data = await fetchUser('123')
  expect(data).toHaveProperty('name')
  expect(data.id).toBe('123')
})
```

## Mock 外部模块

```typescript
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: '1', name: '测试用户' }),
}))
```

## 快照测试

```typescript
it('应该匹配快照', () => {
  const result = formatOutput(data)
  expect(result).toMatchSnapshot()
})
```

## 常用断言

| 断言 | 用途 |
|------|------|
| `toBe(value)` | 严格相等 |
| `toEqual(value)` | 深度相等 |
| `toContain(item)` | 包含元素 |
| `toThrow()` | 抛出错误 |
| `toHaveBeenCalledWith(args)` | Mock 调用参数 |
| `toMatchObject(obj)` | 部分匹配对象 |
