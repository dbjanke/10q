import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRouter from '../../routes/admin.js';
import { getUserStore } from '../../stores/user.store.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { MAX_GROUP_NAME_LENGTH } from '../../config/validation.js';

vi.mock('../../stores/user.store.js', () => ({
    getUserStore: vi.fn(),
}));

type MockUser = {
    id: number;
    email: string;
    role: 'admin' | 'user';
    status: 'invited' | 'active' | 'disabled';
    createdAt: Date;
};

function createApp(user: MockUser) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.user = user as any;
        next();
    });
    app.use('/api/admin', adminRouter);
    return app;
}

function mockStore(overrides: Partial<Record<string, any>> = {}) {
    const store = {
        listUsers: vi.fn().mockReturnValue([]),
        getUserGroupIds: vi.fn().mockReturnValue([]),
        listGroupsWithMembers: vi.fn().mockReturnValue([]),
        listGroups: vi.fn().mockReturnValue([]),
        createGroup: vi.fn(),
        updateGroup: vi.fn(),
        deleteGroup: vi.fn(),
        getUserByEmail: vi.fn(),
        createUser: vi.fn(),
        getUserById: vi.fn(),
        getAdminCount: vi.fn().mockReturnValue(2),
        updateUser: vi.fn().mockReturnValue({
            id: 1,
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            createdAt: new Date(),
        }),
        setUserGroups: vi.fn(),
        setGroupPermissions: vi.fn(),
    };

    return { ...store, ...overrides };
}

const adminUser: MockUser = {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date(),
};

describe('Admin routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects disabled admins', async () => {
        const app = createApp({ ...adminUser, status: 'disabled' });
        const response = await request(app).get('/api/admin/permissions');
        expect(response.status).toBe(403);
    });

    it('returns permissions list', async () => {
        const app = createApp(adminUser);
        const response = await request(app).get('/api/admin/permissions');
        expect(response.status).toBe(200);
        expect(response.body.permissions).toEqual(PERMISSIONS);
    });

    it('rejects group names that are too long', async () => {
        vi.mocked(getUserStore).mockReturnValue(mockStore());
        const app = createApp(adminUser);

        const response = await request(app)
            .post('/api/admin/groups')
            .send({ name: 'a'.repeat(MAX_GROUP_NAME_LENGTH + 1) });

        expect(response.status).toBe(400);
    });

    it('returns 409 for duplicate group names', async () => {
        const store = mockStore({
            createGroup: vi.fn(() => {
                throw new Error('UNIQUE constraint failed: groups.name');
            }),
        });
        vi.mocked(getUserStore).mockReturnValue(store as any);
        const app = createApp(adminUser);

        const response = await request(app)
            .post('/api/admin/groups')
            .send({ name: 'prompt-tools' });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Group already exists');
    });

    it('rejects non-array permissions updates', async () => {
        const store = mockStore({
            listGroups: vi.fn().mockReturnValue([{ id: 1, name: 'prompt-tools', permissions: [] }]),
        });
        vi.mocked(getUserStore).mockReturnValue(store as any);
        const app = createApp(adminUser);

        const response = await request(app)
            .patch('/api/admin/groups/1')
            .send({ permissions: 'regenerate_summary_question' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Permissions must be an array');
    });

    it('returns 404 when updating a missing group', async () => {
        const store = mockStore({
            listGroups: vi.fn().mockReturnValue([]),
        });
        vi.mocked(getUserStore).mockReturnValue(store as any);
        const app = createApp(adminUser);

        const response = await request(app)
            .patch('/api/admin/groups/99')
            .send({ permissions: [] });

        expect(response.status).toBe(404);
    });

    it('rejects non-array groupIds when updating users', async () => {
        const store = mockStore({
            getUserById: vi.fn().mockReturnValue({
                id: 1,
                email: 'admin@example.com',
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
            }),
        });
        vi.mocked(getUserStore).mockReturnValue(store as any);
        const app = createApp(adminUser);

        const response = await request(app)
            .patch('/api/admin/users/1')
            .send({ groupIds: '1' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Group IDs must be an array');
    });

    it('rejects invalid groupIds when updating users', async () => {
        const store = mockStore({
            getUserById: vi.fn().mockReturnValue({
                id: 1,
                email: 'admin@example.com',
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
            }),
            listGroups: vi.fn().mockReturnValue([{ id: 2, name: 'prompt-tools', permissions: [] }]),
        });
        vi.mocked(getUserStore).mockReturnValue(store as any);
        const app = createApp(adminUser);

        const response = await request(app)
            .patch('/api/admin/users/1')
            .send({ groupIds: [999] });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid group ID');
    });
});
