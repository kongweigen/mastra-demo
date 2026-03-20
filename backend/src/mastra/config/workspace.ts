import { Workspace, LocalFilesystem } from '@mastra/core/workspace'
import { resolve } from 'path'

const workspaceDir = resolve(process.cwd(), 'workspace')

export const mainWorkspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: workspaceDir }),
  skills: ['./**/skills'],
  bm25: true,
})
