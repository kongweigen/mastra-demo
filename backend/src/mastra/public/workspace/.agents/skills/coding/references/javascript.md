# JavaScript / TypeScript 模式

## 现代 JS 最佳实践

- 默认使用 `const`，仅在需要重新赋值时使用 `let`
- 优先使用 `async/await` 而非 `.then()` 链
- 善用可选链（`?.`）和空值合并（`??`）
- 使用解构赋值让代码更简洁
- 使用模板字符串进行字符串插值

## TypeScript 技巧

- 对象类型优先用 `interface`（错误信息更友好）
- 字典类型使用 `Record<K, V>`
- 用 `satisfies` 运算符确保对象字面量类型安全
- 用 `as const` 推断字面量类型
- 避免 `any` — 真正未知的类型用 `unknown`

## 常用模式

### 错误处理
```typescript
class AppError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message)
    this.name = 'AppError'
  }
}
```

### 重试逻辑
```typescript
async function retry<T>(fn: () => Promise<T>, attempts = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn() }
    catch (e) { if (i === attempts - 1) throw e; await sleep(delay * (i + 1)) }
  }
  throw new Error('不可达')
}
```
