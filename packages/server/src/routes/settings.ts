import { Router } from 'express';
import { getChatfireSettings, setChatfireModel } from '../lib/chatfire.js';

export const settingsRouter = Router();

settingsRouter.get('/model', (_req, res) => {
  try {
    res.json(getChatfireSettings());
  } catch (error) {
    console.error('Error fetching model settings:', error);
    res.status(500).json({ error: 'Failed to fetch model settings' });
  }
});

settingsRouter.patch('/model', (req, res) => {
  try {
    const { model } = req.body as { model?: string };
    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    res.json(setChatfireModel(model));
  } catch (error) {
    console.error('Error updating model settings:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update model settings' });
  }
});
