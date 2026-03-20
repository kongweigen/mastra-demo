import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const webSearchTool = createTool({
    id: 'web-search',
    description: '搜索网络上任何主题的信息。',
    inputSchema: z.object({
        query: z.string().describe('搜索查询词'),
    }),
    outputSchema: z.object({
        results: z.array(
            z.object({
                title: z.string(),
                snippet: z.string(),
                url: z.string(),
            }),
        ),
    }),
    execute: async ({ query }) => {
        // 模拟实现 — 可替换为 SerpAPI / Tavily 获取真实结果
        return {
            results: [
                {
                    title: `搜索结果：${query}`,
                    snippet: `这是"${query}"的模拟搜索结果。配置真实搜索 API（SerpAPI、Tavily）以获取实时结果。`,
                    url: `https://example.com/search?q=${encodeURIComponent(query)}`,
                },
                {
                    title: `${query} - 百科`,
                    snippet: `关于 ${query} 的综合概述，来自模拟百科来源。`,
                    url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(query)}`,
                },
            ],
        }
    },
})
