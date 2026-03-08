import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const db = new Database(join(__dirname, '../../data.db'));

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    script TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'idle',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    input_data TEXT NOT NULL DEFAULT '{}',
    output_data TEXT NOT NULL DEFAULT '{}',
    review_status TEXT NOT NULL DEFAULT 'pending',
    review_comments TEXT NOT NULL DEFAULT '',
    completed_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scene_number INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    time_of_day TEXT NOT NULL DEFAULT '',
    characters TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    appearance TEXT NOT NULL DEFAULT '',
    personality TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    shot_number INTEGER NOT NULL,
    scene_id TEXT,
    description TEXT NOT NULL DEFAULT '',
    camera_angle TEXT NOT NULL DEFAULT '',
    camera_movement TEXT NOT NULL DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 3,
    seedance_prompt TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL
  );
`);

const phaseColumns = db.prepare(`PRAGMA table_info(phases)`).all() as Array<{ name: string }>;
const phaseColumnNames = new Set(phaseColumns.map((column) => column.name));

if (!phaseColumnNames.has('review_decision')) {
  db.exec(`ALTER TABLE phases ADD COLUMN review_decision TEXT NOT NULL DEFAULT 'pending'`);
}

if (!phaseColumnNames.has('review_decision_note')) {
  db.exec(`ALTER TABLE phases ADD COLUMN review_decision_note TEXT NOT NULL DEFAULT ''`);
}

export type ProjectStatus = 'idle' | 'running' | 'completed' | 'failed';
export type ReviewStatus = 'pending' | 'business_pass' | 'business_fail' | 'compliance_pass' | 'compliance_fail';
export type ReviewDecision = 'pending' | 'confirmed' | 'needs_optimization';

export interface Project {
  id: string;
  title: string;
  script: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  project_id: string;
  phase_number: 1 | 2 | 3;
  name: string;
  input_data: string;
  output_data: string;
  review_status: ReviewStatus;
  review_comments: string;
  review_decision: ReviewDecision;
  review_decision_note: string;
  completed_at: string | null;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  description: string;
  location: string;
  time_of_day: string;
  characters: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  description: string;
  appearance: string;
  personality: string;
}

export interface Shot {
  id: string;
  project_id: string;
  shot_number: number;
  scene_id: string | null;
  description: string;
  camera_angle: string;
  camera_movement: string;
  duration: number;
  seedance_prompt: string;
}
