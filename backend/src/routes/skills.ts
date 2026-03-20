import { Hono } from 'hono'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export const skillsRoute = new Hono()

interface SkillMeta {
    name: string
    description: string
    version?: string
    author?: string
    content: string
    references: string[]
}

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!match) return { meta: {}, body: raw }

    const meta: Record<string, any> = {}
    for (const line of match[1].split('\n')) {
        const kv = line.match(/^(\w[\w.]*?):\s*"?(.+?)"?\s*$/)
        if (kv) {
            const keys = kv[1].split('.')
            if (keys.length === 2) {
                meta[keys[0]] = meta[keys[0]] || {}
                meta[keys[0]][keys[1]] = kv[2]
            } else {
                meta[kv[1]] = kv[2]
            }
        }
    }
    return { meta, body: match[2].trim() }
}

skillsRoute.get('/api/skills', async (c) => {
    const skillsDir = join(process.cwd(), 'workspace', 'skills')

    try {
        const entries = await readdir(skillsDir, { withFileTypes: true })
        const skills: SkillMeta[] = []

        for (const entry of entries) {
            if (!entry.isDirectory()) continue
            const skillPath = join(skillsDir, entry.name)
            const skillFile = join(skillPath, 'SKILL.md')

            try {
                const raw = await readFile(skillFile, 'utf-8')
                const { meta, body } = parseFrontmatter(raw)

                let references: string[] = []
                try {
                    const refsDir = join(skillPath, 'references')
                    const refs = await readdir(refsDir)
                    references = refs.filter((f) => f.endsWith('.md'))
                } catch {
                    // No references directory
                }

                skills.push({
                    name: meta.name ?? entry.name,
                    description: meta.description ?? '',
                    version: meta.metadata?.version,
                    author: meta.metadata?.author,
                    content: body,
                    references,
                })
            } catch {
                // Skip skills without SKILL.md
            }
        }

        return c.json({ skills })
    } catch {
        return c.json({ skills: [] })
    }
})
