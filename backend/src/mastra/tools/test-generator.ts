import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const testGeneratorTool = createTool({
    id: 'test-generator',
    description: '根据给定的函数签名或代码片段，生成对应的测试用例框架（Vitest 格式）。',
    inputSchema: z.object({
        functionCode: z.string().describe('要测试的函数代码或函数签名'),
        functionName: z.string().describe('函数名称'),
        framework: z
            .enum(['vitest', 'jest'])
            .default('vitest')
            .describe('测试框架'),
    }),
    outputSchema: z.object({
        testCode: z.string(),
        testCases: z.array(z.string()),
        coverage: z.string(),
    }),
    execute: async ({ functionCode, functionName, framework }) => {
        const importLine =
            framework === 'vitest'
                ? `import { describe, it, expect } from 'vitest'`
                : `// Jest 自动全局注入`

        const testCases = [
            `正常输入 - 验证基本功能`,
            `边界值 - 空输入 / null / undefined`,
            `错误路径 - 无效参数应抛出错误`,
            `类型检查 - 验证返回值类型`,
        ]

        const testCode = `${importLine}

describe('${functionName}', () => {
  it('应该正确处理正常输入', () => {
    // TODO: 根据实际函数逻辑填充
    // const result = ${functionName}(validInput)
    // expect(result).toBe(expectedOutput)
  })

  it('应该处理空输入', () => {
    // TODO: 测试空值边界
    // expect(() => ${functionName}(null)).toThrow()
  })

  it('应该处理边界值', () => {
    // TODO: 测试边界条件
  })

  it('应该在无效参数时抛出错误', () => {
    // TODO: 测试错误路径
    // expect(() => ${functionName}(invalidInput)).toThrow()
  })
})

/*
原始函数代码：
${functionCode}
*/`

        return {
            testCode,
            testCases,
            coverage: `已生成 ${testCases.length} 个测试用例框架，覆盖正常路径、边界值和错误处理。`,
        }
    },
})
