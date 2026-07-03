import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

export default function boardsRouter(sql: any) {
  const router = Router();

  router.use(authenticateToken);

  router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name } = req.body;
      const userId = req.user!.userId;
      const boardId = crypto.randomUUID();

      const result = await sql`
        INSERT INTO boards (id, name, owner_id, state)
        VALUES (${boardId}, ${name || 'Untitled Board'}, ${userId}, '[]'::jsonb)
        RETURNING id, name, created_at
      `;

      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating board:', error);
      res.status(500).json({ error: 'Failed to create board' });
    }
  });

  router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const boards = await sql`
        SELECT id, name, created_at FROM boards WHERE owner_id = ${userId} ORDER BY created_at DESC
      `;
      res.json(boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      res.status(500).json({ error: 'Failed to fetch boards' });
    }
  });

  router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const boardId = req.params.id;
      const boards = await sql`SELECT id, name, created_at FROM boards WHERE id = ${boardId}`;
      if (boards.length === 0) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      res.json({ board: boards[0] });
    } catch (error) {
      console.error('Error fetching board:', error);
      res.status(500).json({ error: 'Failed to fetch board' });
    }
  });

  return router;
}
