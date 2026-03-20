import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { evaluate } from 'mathjs'

export const calculatorTool = createTool({
    id: 'calculator',
    description:
        '计算数学表达式。支持算术、代数、单位换算等。',
    inputSchema: z.object({
        expression: z
            .string()
            .describe('要计算的数学表达式，如 "2^10"、"sqrt(144)"、"5 inches to cm"'),
    }),
    outputSchema: z.object({
        result: z.string(),
        expression: z.string(),
    }),
    execute: async ({ expression }) => {
        try {
            const result = evaluate(expression)
            return { result: String(result), expression }
        } catch (e) {
            return {
                result: `Error: ${e instanceof Error ? e.message : String(e)}`,
                expression,
            }
        }
    },
})
