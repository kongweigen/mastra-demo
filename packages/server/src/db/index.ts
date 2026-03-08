import { v4 as uuidv4 } from 'uuid';
import { db, Project, Phase, Scene, Character, Shot, ProjectStatus, ReviewStatus, ReviewDecision } from './schema.js';

// Projects
export function createProject(title: string, script: string): Project {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO projects (id, title, script, status)
    VALUES (?, ?, ?, 'idle')
  `);
  stmt.run(id, title, script);
  return getProject(id)!;
}

export function getProject(id: string): Project | undefined {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  return stmt.get(id) as Project | undefined;
}

export function getAllProjects(): Project[] {
  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
  return stmt.all() as Project[];
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  const stmt = db.prepare(`
    UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?
  `);
  stmt.run(status, id);
}

export function deleteProject(id: string): void {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
}

export function updateProjectScript(id: string, script: string): void {
  const stmt = db.prepare(`
    UPDATE projects SET script = ?, updated_at = datetime('now') WHERE id = ?
  `);
  stmt.run(script, id);
}

// Phases
export function createPhase(projectId: string, phaseNumber: 1 | 2 | 3, name: string, inputData: object = {}): Phase {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO phases (id, project_id, phase_number, name, input_data)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, projectId, phaseNumber, name, JSON.stringify(inputData));
  return getPhase(id)!;
}

export function getPhase(id: string): Phase | undefined {
  const stmt = db.prepare('SELECT * FROM phases WHERE id = ?');
  return stmt.get(id) as Phase | undefined;
}

export function getPhasesByProject(projectId: string): Phase[] {
  const stmt = db.prepare('SELECT * FROM phases WHERE project_id = ? ORDER BY phase_number');
  return stmt.all(projectId) as Phase[];
}

export function getPhaseByNumber(projectId: string, phaseNumber: number): Phase | undefined {
  const stmt = db.prepare('SELECT * FROM phases WHERE project_id = ? AND phase_number = ?');
  return stmt.get(projectId, phaseNumber) as Phase | undefined;
}

export function updatePhaseOutput(id: string, outputData: object): void {
  const stmt = db.prepare(`
    UPDATE phases SET output_data = ?, completed_at = datetime('now') WHERE id = ?
  `);
  stmt.run(JSON.stringify(outputData), id);
}

export function updatePhaseReview(id: string, status: ReviewStatus, comments: string): void {
  const stmt = db.prepare(`
    UPDATE phases SET review_status = ?, review_comments = ? WHERE id = ?
  `);
  stmt.run(status, comments, id);
}

export function updatePhaseDecision(id: string, decision: ReviewDecision, note = ''): void {
  const stmt = db.prepare(`
    UPDATE phases SET review_decision = ?, review_decision_note = ? WHERE id = ?
  `);
  stmt.run(decision, note, id);
}

// Scenes
export function createScene(projectId: string, sceneNumber: number, data: Partial<Scene>): Scene {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO scenes (id, project_id, scene_number, description, location, time_of_day, characters)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    projectId,
    sceneNumber,
    data.description || '',
    data.location || '',
    data.time_of_day || '',
    data.characters || '[]'
  );
  return getScene(id)!;
}

export function getScene(id: string): Scene | undefined {
  const stmt = db.prepare('SELECT * FROM scenes WHERE id = ?');
  return stmt.get(id) as Scene | undefined;
}

export function getScenesByProject(projectId: string): Scene[] {
  const stmt = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number');
  return stmt.all(projectId) as Scene[];
}

export function clearScenesByProject(projectId: string): void {
  const stmt = db.prepare('DELETE FROM scenes WHERE project_id = ?');
  stmt.run(projectId);
}

// Characters
export function createCharacter(projectId: string, data: Partial<Character>): Character {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO characters (id, project_id, name, description, appearance, personality)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    projectId,
    data.name || '',
    data.description || '',
    data.appearance || '',
    data.personality || ''
  );
  return getCharacter(id)!;
}

export function getCharacter(id: string): Character | undefined {
  const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
  return stmt.get(id) as Character | undefined;
}

export function getCharactersByProject(projectId: string): Character[] {
  const stmt = db.prepare('SELECT * FROM characters WHERE project_id = ?');
  return stmt.all(projectId) as Character[];
}

export function clearCharactersByProject(projectId: string): void {
  const stmt = db.prepare('DELETE FROM characters WHERE project_id = ?');
  stmt.run(projectId);
}

// Shots
export function createShot(projectId: string, shotNumber: number, data: Partial<Shot>): Shot {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO shots (id, project_id, shot_number, scene_id, description, camera_angle, camera_movement, duration, seedance_prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    projectId,
    shotNumber,
    data.scene_id || null,
    data.description || '',
    data.camera_angle || '',
    data.camera_movement || '',
    data.duration || 3,
    data.seedance_prompt || ''
  );
  return getShot(id)!;
}

export function getShot(id: string): Shot | undefined {
  const stmt = db.prepare('SELECT * FROM shots WHERE id = ?');
  return stmt.get(id) as Shot | undefined;
}

export function getShotsByProject(projectId: string): Shot[] {
  const stmt = db.prepare('SELECT * FROM shots WHERE project_id = ? ORDER BY shot_number');
  return stmt.all(projectId) as Shot[];
}

export function clearShotsByProject(projectId: string): void {
  const stmt = db.prepare('DELETE FROM shots WHERE project_id = ?');
  stmt.run(projectId);
}
