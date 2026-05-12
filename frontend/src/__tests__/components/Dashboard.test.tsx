import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import * as api from '../../hooks/useApi';
import { mockConversations } from '../fixtures/mockData';

vi.mock('../../hooks/useApi');

vi.mock('../../components/AppHeader', () => ({
    default: ({ user }: any) => <div data-testid="app-header">{user.email}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const currentUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    status: 'active' as const,
    createdAt: new Date(),
};

function renderDashboard() {
    return render(
        <BrowserRouter>
            <Dashboard currentUser={currentUser} onLogout={vi.fn()} />
        </BrowserRouter>
    );
}

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockReset();
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    });

    describe('loading state', () => {
        it('shows loading state while fetching conversations', async () => {
            let resolve: (value: any) => void;
            vi.mocked(api.getAllConversations).mockReturnValue(
                new Promise((r) => { resolve = r; })
            );

            renderDashboard();

            expect(screen.getByText('Loading...')).toBeInTheDocument();

            resolve!(mockConversations);
        });
    });

    describe('empty state', () => {
        it('shows empty state when there are no conversations', async () => {
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('No conversations yet')).toBeInTheDocument();
            });

            expect(screen.getByRole('button', { name: 'Create your first conversation' })).toBeInTheDocument();
        });
    });

    describe('conversation list', () => {
        it('renders a list of conversations', async () => {
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Career transition thoughts')).toBeInTheDocument();
            });

            expect(screen.getByText('Relationship boundaries')).toBeInTheDocument();
        });

        it('shows "Completed" for completed conversations', async () => {
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Completed')).toBeInTheDocument();
            });
        });

        it('shows progress for in-progress conversations', async () => {
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Question 3/10')).toBeInTheDocument();
            });
        });

        it('navigates to the conversation when a row is clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Career transition thoughts')).toBeInTheDocument();
            });

            await user.click(screen.getByText('Career transition thoughts'));

            expect(mockNavigate).toHaveBeenCalledWith('/conversation/1');
        });
    });

    describe('error state', () => {
        it('shows an error message when conversations fail to load', async () => {
            vi.mocked(api.getAllConversations).mockRejectedValue(new Error('Network error'));
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
            });
        });
    });

    describe('new conversation modal', () => {
        it('opens the modal when "Start New Conversation" is clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Start New Conversation' })).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));

            expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter a topic or question...')).toBeInTheDocument();
        });

        it('opens the modal from the empty state button', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Create your first conversation' })).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: 'Create your first conversation' }));

            expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
        });

        it('closes the modal when Cancel is clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();

            await waitFor(() => screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Cancel' }));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByPlaceholderText('Enter a topic or question...')).not.toBeInTheDocument();
        });

        it('disables Start button when input is empty', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();

            await waitFor(() => screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));

            expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
        });

        it('navigates to the new conversation after creation', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            vi.mocked(api.createConversation).mockResolvedValue({
                conversation: { id: 5, title: 'New Topic', createdAt: new Date(), completed: false, currentQuestionNumber: 0 },
            } as any);

            renderDashboard();

            await waitFor(() => screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.type(screen.getByPlaceholderText('Enter a topic or question...'), 'New Topic');
            await user.click(screen.getByRole('button', { name: 'Start' }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/conversation/5');
            });
        });

        it('shows an error when conversation creation fails', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            vi.mocked(api.createConversation).mockRejectedValue(new Error('Title is required'));

            renderDashboard();

            await waitFor(() => screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.type(screen.getByPlaceholderText('Enter a topic or question...'), 'Some title');
            await user.click(screen.getByRole('button', { name: 'Start' }));

            await waitFor(() => {
                expect(screen.getByText('Title is required')).toBeInTheDocument();
            });

            // Modal stays open so the user can fix it
            expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
        });
    });

    describe('article upload in modal', () => {
        async function openModal() {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue([]);
            renderDashboard();
            await waitFor(() => screen.getByRole('button', { name: 'Start New Conversation' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));
            return user;
        }

        it('shows uploading state while article is being processed', async () => {
            const user = await openModal();

            let resolve: (value: any) => void;
            vi.mocked(api.uploadArticle).mockReturnValue(new Promise((r) => { resolve = r; }));

            const file = new File(['%PDF-1.4'], 'article.pdf', { type: 'application/pdf' });
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            await user.upload(input, file);

            expect(api.uploadArticle).toHaveBeenCalledWith(file);
            expect(screen.getByText('Processing article...')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();

            resolve!({ keyInsights: '• Insight', summary: 'Summary text' });
        });

        it('shows "Article ready" after a successful upload', async () => {
            const user = await openModal();

            vi.mocked(api.uploadArticle).mockResolvedValue({
                keyInsights: '• Insight',
                summary: 'Summary text',
            });

            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            const file = new File(['%PDF-1.4'], 'article.pdf', { type: 'application/pdf' });
            await user.upload(input, file);

            await waitFor(() => {
                expect(screen.getByText(/Article ready: article\.pdf/)).toBeInTheDocument();
            });
        });

        it('shows an error when the upload fails', async () => {
            const user = await openModal();

            vi.mocked(api.uploadArticle).mockRejectedValue(new Error('PDF exceeds size limit'));

            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            const file = new File(['data'], 'big.pdf', { type: 'application/pdf' });
            await user.upload(input, file);

            await waitFor(() => {
                expect(screen.getByText('PDF exceeds size limit')).toBeInTheDocument();
            });
        });

        it('passes article context to createConversation after successful upload', async () => {
            const user = await openModal();

            vi.mocked(api.uploadArticle).mockResolvedValue({
                keyInsights: '• Insight one',
                summary: 'Two-paragraph summary.',
            });
            vi.mocked(api.createConversation).mockResolvedValue({
                conversation: { id: 7, title: 'Topic', createdAt: new Date(), completed: false, currentQuestionNumber: 0 },
            } as any);

            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            await user.upload(input, new File(['%PDF-1.4'], 'article.pdf', { type: 'application/pdf' }));

            await waitFor(() => screen.getByText(/Article ready/));

            await user.type(screen.getByPlaceholderText('Enter a topic or question...'), 'Topic');
            await user.click(screen.getByRole('button', { name: 'Start' }));

            await waitFor(() => {
                expect(api.createConversation).toHaveBeenCalledWith('Topic', {
                    contextSummary: 'Two-paragraph summary.',
                    contextKeyInsights: '• Insight one',
                });
            });
        });

        it('clears article state when the modal is closed and reopened', async () => {
            const user = await openModal();

            vi.mocked(api.uploadArticle).mockResolvedValue({
                keyInsights: '• Insight',
                summary: 'Summary.',
            });

            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            await user.upload(input, new File(['%PDF-1.4'], 'article.pdf', { type: 'application/pdf' }));
            await waitFor(() => screen.getByText(/Article ready/));

            await user.click(screen.getByRole('button', { name: 'Cancel' }));
            await user.click(screen.getByRole('button', { name: 'Start New Conversation' }));

            expect(screen.queryByText(/Article ready/)).not.toBeInTheDocument();
        });
    });

    describe('delete conversation', () => {
        it('deletes a conversation after confirmation and reloads the list', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations)
                .mockResolvedValueOnce(mockConversations)
                .mockResolvedValueOnce([mockConversations[1]]);
            vi.mocked(api.deleteConversation).mockResolvedValue(undefined as any);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Career transition thoughts')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(api.deleteConversation).toHaveBeenCalledWith(mockConversations[0].id);
            });
        });

        it('does not delete when the confirmation dialog is dismissed', async () => {
            const user = userEvent.setup();
            vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Career transition thoughts')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
            await user.click(deleteButtons[0]);

            expect(api.deleteConversation).not.toHaveBeenCalled();
        });

        it('shows an error when deletion fails', async () => {
            const user = userEvent.setup();
            vi.mocked(api.getAllConversations).mockResolvedValue(mockConversations);
            vi.mocked(api.deleteConversation).mockRejectedValue(new Error('Server error'));

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Career transition thoughts')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Failed to delete conversation')).toBeInTheDocument();
            });
        });
    });
});
