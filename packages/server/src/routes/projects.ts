import { Router } from 'express';
import * as db from '../db/index.js';

export const projectsRouter = Router();

// 获取所有项目
projectsRouter.get('/', (req, res) => {
  try {
    const projects = db.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 创建新项目
projectsRouter.post('/', (req, res) => {
  try {
    const { title, script } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const project = db.createProject(title, script || '');
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// 获取单个项目
projectsRouter.get('/:id', (req, res) => {
  try {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 获取关联数据
    const phases = db.getPhasesByProject(project.id);
    const scenes = db.getScenesByProject(project.id);
    const characters = db.getCharactersByProject(project.id);
    const shots = db.getShotsByProject(project.id);

    res.json({
      ...project,
      phases,
      scenes,
      characters,
      shots,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// 更新项目
projectsRouter.put('/:id', (req, res) => {
  try {
    const { title, script } = req.body;
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (title) {
      // 更新标题需要重建项目
      db.deleteProject(req.params.id);
      const newProject = db.createProject(title, script || project.script);
      return res.json(newProject);
    }

    if (script !== undefined) {
      db.updateProjectScript(req.params.id, script);
    }

    res.json(db.getProject(req.params.id));
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// 删除项目
projectsRouter.delete('/:id', (req, res) => {
  try {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.deleteProject(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
