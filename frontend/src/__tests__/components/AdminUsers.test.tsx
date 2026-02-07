import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from '../../components/AdminUsers';
import * as api from '../../hooks/useApi';

vi.mock('../../hooks/useApi');

vi.mock('../../components/AppHeader', () => ({
    default: ({ user }: any) => <div data-testid="app-header">{user.email}</div>,
}));

describe('AdminUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders groups and updates user membership', async () => {
        const currentUser = {
            id: 1,
            email: 'admin@example.com',
            role: 'admin' as const,
            status: 'active' as const,
        };

        const groups = [
            {
                id: 1,
                name: 'prompt-tools',
                permissions: ['regenerate_summary_question'],
                memberIds: [2],
            },
        ];

        const users = [
            {
                id: 2,
                email: 'user@example.com',
                role: 'user' as const,
                status: 'active' as const,
                groupIds: [1],
            },
        ];

        vi.mocked(api.getUsers).mockResolvedValue(users as any);
        vi.mocked(api.getGroups).mockResolvedValue(groups as any);
        vi.mocked(api.getPermissions).mockResolvedValue(['regenerate_summary_question'] as any);
        vi.mocked(api.updateUser).mockResolvedValue({
            ...users[0],
            groupIds: [],
        } as any);

        render(<AdminUsers currentUser={currentUser as any} onLogout={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getAllByText('prompt-tools').length).toBeGreaterThan(0);
        });

        const checkbox = screen.getByLabelText('prompt-tools') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);

        const user = userEvent.setup();
        await user.click(checkbox);

        await waitFor(() => {
            expect(api.updateUser).toHaveBeenCalledWith(2, { groupIds: [] });
        });
    });
});
