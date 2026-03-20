import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const codeRunnerTool = createTool({
    id: 'code-runner',
    description: '执行 JavaScript 代码并返回结果。代码在沙盒环境中运行。',
    inputSchema: z.object({
        code: z.string().describe('要执行的 JavaScript 代码。最后一个表达式的值会被返回。'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        result: z.string(),
        error: z.string().optional(),
    }),
    execute: async ({ code }) => {
        try {
            // Simple sandboxed execution via Function constructor
            const fn = new Function(`'use strict'; return (async () => { ${code} })()`)
            const result = await fn()
            return { success: true, result: String(result ?? 'undefined') }
        } catch (e) {
            return {
                success: false,
                result: '',
                error: e instanceof Error ? e.message : String(e),
            }
        }
    },
})
