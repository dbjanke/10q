import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getUserStore } from '../stores/user.store.js';
import { parseIdParam } from '../utils/params.js';

const router = Router();

router.use(requireAdmin);

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.get('/users', (_req: Request, res: Response) => {
    const users = getUserStore().listUsers();
    res.json(users);
});

router.post('/users', (req: Request, res: Response) => {
    const { email, role } = req.body as { email?: string; role?: 'admin' | 'user' };

    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    const userStore = getUserStore();
    const existing = userStore.getUserByEmail(email);
    if (existing) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const created = userStore.createUser({
        email: email.toLowerCase(),
        role: role || 'user',
        status: 'invited',
    });

    return res.status(201).json(created);
});

router.patch('/users/:id', (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { role, status } = req.body as {
        role?: 'admin' | 'user';
        status?: 'invited' | 'active' | 'disabled';
    };

    if (role && role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    if (status && status !== 'invited' && status !== 'active' && status !== 'disabled') {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const userStore = getUserStore();
    const existing = userStore.getUserById(id);
    if (!existing) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (existing.role === 'admin' && role === 'user') {
        const adminCount = userStore.getAdminCount();
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'At least one admin must remain' });
        }
    }

    if (existing.role === 'admin' && status === 'disabled') {
        const adminCount = userStore.getAdminCount();
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'At least one admin must remain active' });
        }
    }

    const updated = userStore.updateUser(id, {
        role,
        status,
    });

    return res.json(updated);
});

router.delete('/users/:id', (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userStore = getUserStore();
    const existing = userStore.getUserById(id);
    if (!existing) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (existing.role === 'admin') {
        const adminCount = userStore.getAdminCount();
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'At least one admin must remain' });
        }
    }

    const deleted = userStore.deleteUser(id);
    if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
    }

    return res.status(204).send();
});

export default router;
