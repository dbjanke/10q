import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getUserStore } from '../stores/user.store.js';
import { parseIdParam } from '../utils/params.js';
import { PERMISSIONS, isValidPermission, type Permission } from '../config/permissions.js';
import { MAX_GROUP_NAME_LENGTH } from '../config/validation.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAdmin);

const ADMIN_RATE_LIMIT_WINDOW_MS = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60000);
const ADMIN_RATE_LIMIT_MAX = Number(process.env.ADMIN_RATE_LIMIT_MAX || 120);

const adminRateLimit = rateLimit({
    windowMs: ADMIN_RATE_LIMIT_WINDOW_MS,
    max: ADMIN_RATE_LIMIT_MAX,
    keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip || 'unknown'),
});

router.use(adminRateLimit);

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.get('/users', (_req: Request, res: Response) => {
    const userStore = getUserStore();
    const users = userStore.listUsers();
    const usersWithGroups = users.map((user) => ({
        ...user,
        groupIds: userStore.getUserGroupIds(user.id),
    }));
    res.json(usersWithGroups);
});

router.get('/permissions', (_req: Request, res: Response) => {
    res.json({ permissions: PERMISSIONS });
});

router.get('/groups', (_req: Request, res: Response) => {
    const groups = getUserStore().listGroupsWithMembers();
    res.json(groups);
});

router.post('/groups', (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    if (name.trim().length > MAX_GROUP_NAME_LENGTH) {
        return res.status(400).json({
            error: `Group name too long. Maximum length is ${MAX_GROUP_NAME_LENGTH} characters.`,
        });
    }

    try {
        const created = getUserStore().createGroup(name.trim());
        return res.status(201).json(created);
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('UNIQUE constraint failed: groups.name')) {
            return res.status(409).json({ error: 'Group already exists' });
        }
        return res.status(500).json({ error: 'Failed to create group' });
    }
});

router.patch('/groups/:id', (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid group ID' });
    }

    const { name, permissions } = req.body as { name?: string; permissions?: string[] };

    if (permissions && !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Permissions must be an array' });
    }

    if (permissions && permissions.some((permission) => !isValidPermission(permission))) {
        return res.status(400).json({ error: 'Invalid permission' });
    }

    if (name !== undefined && !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    if (name && name.trim().length > MAX_GROUP_NAME_LENGTH) {
        return res.status(400).json({
            error: `Group name too long. Maximum length is ${MAX_GROUP_NAME_LENGTH} characters.`,
        });
    }

    const userStore = getUserStore();
    const safePermissions = permissions ? (permissions as Permission[]) : undefined;

    const existingGroup = userStore.listGroups().find((group) => group.id === id);
    if (!existingGroup) {
        return res.status(404).json({ error: 'Group not found' });
    }

    if (safePermissions) {
        userStore.setGroupPermissions(id, safePermissions);
    }

    if (name) {
        try {
            const updated = userStore.updateGroup(id, name.trim());
            if (!updated) {
                return res.status(404).json({ error: 'Group not found' });
            }
            return res.json(updated);
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes('UNIQUE constraint failed: groups.name')) {
                return res.status(409).json({ error: 'Group already exists' });
            }
            return res.status(500).json({ error: 'Failed to update group' });
        }
    }

    const group = userStore.listGroupsWithMembers().find((g) => g.id === id);
    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }
    return res.json(group);
});

router.delete('/groups/:id', (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid group ID' });
    }

    const deleted = getUserStore().deleteGroup(id);
    if (!deleted) {
        return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(204).send();
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

    const { role, status, groupIds } = req.body as {
        role?: 'admin' | 'user';
        status?: 'invited' | 'active' | 'disabled';
        groupIds?: number[];
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

    if (groupIds !== undefined && !Array.isArray(groupIds)) {
        return res.status(400).json({ error: 'Group IDs must be an array' });
    }

    if (groupIds) {
        if (groupIds.some((groupId) => typeof groupId !== 'number' || Number.isNaN(groupId))) {
            return res.status(400).json({ error: 'Invalid group ID' });
        }
        const availableGroupIds = new Set(userStore.listGroups().map((group) => group.id));
        const invalid = groupIds.find((groupId) => !availableGroupIds.has(groupId));
        if (invalid !== undefined) {
            return res.status(400).json({ error: 'Invalid group ID' });
        }
        userStore.setUserGroups(id, groupIds);
    }

    const updated = userStore.updateUser(id, {
        role,
        status,
    });

    return res.json({
        ...updated,
        groupIds: userStore.getUserGroupIds(id),
    });
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
