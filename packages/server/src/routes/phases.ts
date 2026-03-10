import { Router } from 'express';
import * as db from '../db/index.js';
import { runPhase } from '../agent-service.js';
import { emitEvent } from './sse.js';

export const phasesRouter = Router();

// 获取项目的所有阶段
phasesRouter.get('/project/:projectId', (req, res) => {
  try {
    const phases = db.getPhasesByProject(req.params.projectId);
    res.json(phases);
  } catch (error) {
    console.error('Error fetching phases:', error);
    res.status(500).json({ error: 'Failed to fetch phases' });
  }
});

// 获取单个阶段
phasesRouter.get('/:id', (req, res) => {
  try {
    const phase = db.getPhase(req.params.id);
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    res.json(phase);
  } catch (error) {
    console.error('Error fetching phase:', error);
    res.status(500).json({ error: 'Failed to fetch phase' });
  }
});

// 更新阶段审核状态
phasesRouter.patch('/:id/review', (req, res) => {
  try {
    const { status, comments } = req.body;
    const phase = db.getPhase(req.params.id);
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    db.updatePhaseReview(req.params.id, status, comments || '');
    res.json(db.getPhase(req.params.id));
  } catch (error) {
    console.error('Error updating phase review:', error);
    res.status(500).json({ error: 'Failed to update phase review' });
  }
});

// 更新人工审核决策
phasesRouter.patch('/:id/decision', (req, res) => {
  try {
    const { decision, note } = req.body as {
      decision?: 'pending' | 'confirmed' | 'needs_optimization';
      note?: string;
    };
    const phase = db.getPhase(req.params.id);
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    if (!decision || !['pending', 'confirmed', 'needs_optimization'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    console.info(
      `[PhaseDecision] phaseId=${req.params.id} projectId=${phase.project_id} phase=${phase.phase_number} decision=${decision}`
    );
    db.updatePhaseDecision(req.params.id, decision, note || '');
    const updatedPhase = db.getPhase(req.params.id);

    emitEvent(phase.project_id, {
      type: 'phase_decision',
      phase: phase.phase_number,
      phaseId: phase.id,
      decision,
      message:
        decision === 'confirmed'
          ? '已确认当前审核结果'
          : decision === 'needs_optimization'
            ? '已标记为需要优化，准备重新执行当前阶段'
            : '已重置人工决策状态',
      note: note || '',
    });

    if (decision === 'needs_optimization') {
      runPhase(phase.project_id, phase.phase_number).catch((error) => {
        console.error(`[PhaseDecision] failed to rerun phase ${phase.phase_number} for project ${phase.project_id}`, error);
      });
    }

    res.json(updatedPhase);
  } catch (error) {
    console.error('Error updating phase decision:', error);
    res.status(500).json({ error: 'Failed to update phase decision' });
  }
});
