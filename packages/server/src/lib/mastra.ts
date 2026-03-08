// Mastra workspace skill loader
// Uses Mastra's built-in workspace skill system

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceBasePath = resolve(currentDir, '..', '..', 'workspace');

// Create workspace with skills configured
// Skills will be loaded from ./skills directory relative to basePath
export const workspace = new Workspace({
  id: 'main-workspace',
  name: 'Main Workspace',
  filesystem: new LocalFilesystem({ basePath: workspaceBasePath }),
  skills: ['/skills'], // Path relative to workspace basePath
});

// Initialize workspace
workspace.init().catch(console.error);

export async function listSkills() {
  return workspace.skills?.list() || [];
}

export async function logWorkspaceSkillsStatus(context = 'startup') {
  try {
    const skills = await listSkills();
    console.info(
      `[Mastra][${context}] workspace basePath=${workspaceBasePath} skillsLoaded=${skills.length} names=${skills.map((skill) => skill.name).join(', ')}`
    );
  } catch (error) {
    console.error(`[Mastra][${context}] failed to list workspace skills`, error);
  }
}
