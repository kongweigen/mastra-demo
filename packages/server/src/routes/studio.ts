import { Router } from 'express';
import {
  createManagedAgent,
  createManagedSkill,
  listManagedAgents,
  listManagedSkills,
  updateManagedAgent,
  updateManagedSkill,
} from '../lib/studio-config.js';

export const studioRouter = Router();

studioRouter.get('/skills', async (_req, res) => {
  try {
    res.json(await listManagedSkills());
  } catch (error) {
    console.error('Error fetching managed skills:', error);
    res.status(500).json({ error: 'Failed to fetch managed skills' });
  }
});

studioRouter.post('/skills', async (req, res) => {
  try {
    const { name, description, instructions } = req.body;
    res.status(201).json(await createManagedSkill({ name, description, instructions }));
  } catch (error) {
    console.error('Error creating managed skill:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create managed skill' });
  }
});

studioRouter.put('/skills/:name', async (req, res) => {
  try {
    const { description, instructions } = req.body;
    res.json(await updateManagedSkill(req.params.name, { description, instructions }));
  } catch (error) {
    console.error('Error updating managed skill:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update managed skill' });
  }
});

studioRouter.get('/agents', async (_req, res) => {
  try {
    res.json(await listManagedAgents());
  } catch (error) {
    console.error('Error fetching managed agents:', error);
    res.status(500).json({ error: 'Failed to fetch managed agents' });
  }
});

studioRouter.post('/agents', async (req, res) => {
  try {
    const { key, name, description, instructions, phaseNumber, skillNames } = req.body;
    res.status(201).json(
      await createManagedAgent({
        key,
        name,
        description,
        instructions,
        phaseNumber,
        skillNames: Array.isArray(skillNames) ? skillNames : [],
      })
    );
  } catch (error) {
    console.error('Error creating managed agent:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create managed agent' });
  }
});

studioRouter.put('/agents/:id', async (req, res) => {
  try {
    const { key, name, description, instructions, phaseNumber, skillNames } = req.body;
    res.json(
      await updateManagedAgent(req.params.id, {
        key,
        name,
        description,
        instructions,
        phaseNumber,
        skillNames,
      })
    );
  } catch (error) {
    console.error('Error updating managed agent:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update managed agent' });
  }
});

studioRouter.get('/bootstrap', async (_req, res) => {
  try {
    const [agents, skills] = await Promise.all([listManagedAgents(), listManagedSkills()]);
    res.json({ agents, skills });
  } catch (error) {
    console.error('Error bootstrapping studio config:', error);
    res.status(500).json({ error: 'Failed to bootstrap studio config' });
  }
});
