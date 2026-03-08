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
  type: 'phase_start' | 'phase_progress' | 'phase_review' | 'phase_complete' | 'error';
  phase?: number;
  message?: string;
  status?: string;
  comments?: string;
  phaseId?: string;
  reviewStage?: 'business' | 'compliance';
  reviewResult?: 'PASS' | 'FAIL';
  data?: any;
}
