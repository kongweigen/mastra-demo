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
  phases?: Phase[];
  scenes?: Scene[];
  characters?: Character[];
  shots?: Shot[];
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

export interface SSEEvent {
  type: 'phase_start' | 'phase_progress' | 'phase_review' | 'phase_complete' | 'phase_decision' | 'error';
  phase?: number;
  message?: string;
  status?: string;
  comments?: string;
  phaseId?: string;
  decision?: 'pending' | 'confirmed' | 'needs_optimization';
  note?: string;
  reviewStage?: 'business' | 'compliance';
  reviewResult?: 'PASS' | 'FAIL';
  data?: any;
}

export interface ModelSettings {
  model: string;
  availableModels: string[];
}

export interface ManagedSkill {
  name: string;
  description: string;
  instructions: string;
  path: string;
}

export interface ManagedAgent {
  id: string;
  key: string;
  name: string;
  description: string;
  instructions: string;
  phaseNumber: 1 | 2 | 3 | null;
  skillNames: string[];
  updatedAt: string;
}

export interface StudioBootstrap {
  agents: ManagedAgent[];
  skills: ManagedSkill[];
}

// ============================================
// 阶段输出 JSON 类型定义 (英文 Key)
// ============================================

export type MaterialStatus = 'new' | 'reuse' | 'variant';

export interface Phase1PlotPoint {
  episode: number;
  plotPoint: string;
  coreConflict: string;
  emotionalArc: string;
  directorNotes: string;
  estimatedDuration: number;
}

export interface Phase1Character {
  name: string;
  age: string;
  appearance: string;
  status: MaterialStatus;
}

export interface Phase1Scene {
  name: string;
  timeOfDay: string;
  lightingTone: string;
  atmosphere: string;
  status: MaterialStatus;
}

export interface Phase1Output {
  plotBreakdown: Phase1PlotPoint[];
  characters: Phase1Character[];
  scenes: Phase1Scene[];
}

export interface Phase2CharacterStyle {
  name: string;
  prompt: string;
}

export interface Phase2SceneEnvironment {
  name: string;
  prompt: string;
}

export interface Phase2Output {
  characterStyles: Phase2CharacterStyle[];
  sceneEnvironments: Phase2SceneEnvironment[];
}

export interface Phase3Asset {
  assetId: string;
  type: 'character' | 'scene';
  name: string;
}

export interface Phase3Shot {
  shotNumber: number;
  scene: string;
  characters: string;
  cameraAngle: string;
  cameraMovement: string;
  actionDescription: string;
  duration: number;
  seedancePrompt: string;
}

export interface Phase3Output {
  assetMapping: Phase3Asset[];
  shots: Phase3Shot[];
}
