import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ConversationView from '../../components/ConversationView';
import * as api from '../../hooks/useApi';

// Mock the API module
vi.mock('../../hooks/useApi');

// Mock child components to simplify testing
vi.mock('../../components/QuestionCard', () => ({
    default: ({ question }: any) => <div data-testid="question-card">{question.content}</div>,
}));

vi.mock('../../components/ResponseInput', () => ({
    default: ({ onSubmit, disabled }: any) => (
        <button onClick={() => Promise.resolve(onSubmit('Test response')).catch(() => {})} disabled={disabled} data-testid="submit-btn">
            Submit
        </button>
    ),
}));

vi.mock('../../components/Summary', () => ({
    default: ({ summary, canRegenerate, onRegenerate }: any) => (
        <div data-testid="summary">
            <div>{summary}</div>
            {canRegenerate && (
                <button onClick={onRegenerate}>Regenerate</button>
            )}
        </div>
    ),
}));

vi.mock('../../components/LoadingIndicator', () => ({
    default: () => <div data-testid="loading-indicator">Loading...</div>,
}));

vi.mock('../../components/QuestionCarousel', () => ({
    default: ({ questions }: any) => (
        <div data-testid="question-carousel">{questions[0]?.content}</div>
    ),
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ id: '1' }),
        useNavigate: () => vi.fn(),
    };
});

describe('ConversationView - Completion Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const currentUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        status: 'active' as const,
    };

    it('should reload conversation when completion occurs', async () => {
        const user = userEvent.setup();

        // Mock initial conversation state (in progress)
        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 10,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Final question?',
                    questionNumber: 10,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        // Mock completed conversation state (after reload)
        const completedConversation = {
            ...inProgressConversation,
            completed: true,
            summary: 'This is the generated summary',
            messages: [
                ...inProgressConversation.messages,
                {
                    id: 2,
                    conversationId: 1,
                    type: 'response',
                    content: 'Final response',
                    questionNumber: 10,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 3,
                    conversationId: 1,
                    type: 'summary',
                    content: 'This is the generated summary',
                    questionNumber: null,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        // Mock API responses
        let callCount = 0;
        vi.mocked(api.getConversation).mockImplementation(async () => {
            callCount++;
            // First call returns in-progress, second call returns completed
            return callCount === 1 ? inProgressConversation : completedConversation;
        });

        vi.mocked(api.submitResponse).mockResolvedValue({
            savedResponse: {
                id: 2,
                conversationId: 1,
                type: 'response',
                content: 'Final response',
                questionNumber: 10,
                createdAt: new Date().toISOString(),
            },
            isComplete: true,
            summary: 'This is the generated summary',
        });

        // Render component
        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Conversation')).toBeInTheDocument();
        });

        // Verify we're in the in-progress state
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();
        expect(api.getConversation).toHaveBeenCalledTimes(1);

        // Submit the final response
        const submitButton = await screen.findByTestId('submit-btn');
        await user.click(submitButton);

        // Wait for the conversation to reload
        await waitFor(() => {
            expect(api.getConversation).toHaveBeenCalledTimes(2);
        });

        // Verify the summary is now displayed
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
            expect(screen.getByText('This is the generated summary')).toBeInTheDocument();
        });
    });

    it('reloads the conversation after submitting a non-final response', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 5,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 5?',
                    questionNumber: 5,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        const refreshedConversation = {
            ...inProgressConversation,
            currentQuestionNumber: 6,
            messages: [
                ...inProgressConversation.messages,
                {
                    id: 2,
                    conversationId: 1,
                    type: 'response',
                    content: 'Response 5',
                    questionNumber: 5,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 3,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 6?',
                    questionNumber: 6,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation)
            .mockResolvedValueOnce(inProgressConversation as any)
            .mockResolvedValueOnce(refreshedConversation as any);

        vi.mocked(api.submitResponse).mockResolvedValue({
            savedResponse: {
                id: 2,
                conversationId: 1,
                type: 'response',
                content: 'Response 5',
                questionNumber: 5,
                createdAt: new Date().toISOString(),
            },
            isComplete: false,
        });

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Conversation')).toBeInTheDocument();
        });

        const submitButton = await screen.findByTestId('submit-btn');
        await user.click(submitButton);

        await waitFor(() => {
            expect(api.getConversation).toHaveBeenCalledTimes(2);
        });

        // After reload the next question carousel is shown
        expect(await screen.findByTestId('submit-btn')).toBeInTheDocument();
    });

    it('should show loading indicator while submitting response', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 5,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 5?',
                    questionNumber: 5,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        const refreshedConversation = {
            ...inProgressConversation,
            currentQuestionNumber: 6,
            messages: [
                ...inProgressConversation.messages,
                {
                    id: 2,
                    conversationId: 1,
                    type: 'response',
                    content: 'Response 5',
                    questionNumber: 5,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 3,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 6?',
                    questionNumber: 6,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);

        // Mock a slow submit — the loading indicator is visible while this is pending
        let resolveSubmit: (value: any) => void;
        const submitPromise = new Promise((resolve) => { resolveSubmit = resolve; });
        vi.mocked(api.submitResponse).mockReturnValue(submitPromise as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Conversation')).toBeInTheDocument();
        });

        const submitButton = await screen.findByTestId('submit-btn');
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('submit-btn')).not.toBeInTheDocument();

        // Resolve submit, then mock the refresh getConversation call
        vi.mocked(api.getConversation).mockResolvedValueOnce(refreshedConversation as any);
        resolveSubmit!({ savedResponse: { id: 2, conversationId: 1, type: 'response', content: 'Response 5', questionNumber: 5, createdAt: new Date().toISOString() }, isComplete: false });

        await waitFor(() => {
            expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        });
        expect(await screen.findByTestId('submit-btn')).toBeInTheDocument();
    });

    it('allows regenerating summary with permission', async () => {
        const user = userEvent.setup();

        const completedConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: 'Original summary',
            createdAt: new Date().toISOString(),
            completed: true,
            currentQuestionNumber: 10,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'summary',
                    content: 'Original summary',
                    questionNumber: null,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(completedConversation as any);
        vi.mocked(api.regenerateSummary).mockResolvedValue({ summary: 'Updated summary' } as any);

        const currentUserWithPermission = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'user' as const,
            status: 'active' as const,
            permissions: ['regenerate_summary_question'] as const,
        };

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUserWithPermission as any} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        const regenButton = screen.getByRole('button', { name: 'Regenerate' });
        await user.click(regenButton);

        await waitFor(() => {
            expect(api.regenerateSummary).toHaveBeenCalledWith(1);
        });
    });

    it('allows regenerating current question with permission', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 2,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 2?',
                    questionNumber: 2,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);
        vi.mocked(api.regenerateQuestion).mockResolvedValue({
            question: {
                id: 2,
                conversationId: 1,
                type: 'question',
                content: 'Updated question?',
                questionNumber: 2,
                createdAt: new Date().toISOString(),
            },
        } as any);

        const currentUserWithPermission = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'user' as const,
            status: 'active' as const,
            permissions: ['regenerate_summary_question'] as const,
        };

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUserWithPermission as any} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
        });

        const regenButton = await screen.findByRole('button', { name: 'Regenerate question' });
        await user.click(regenButton);

        await waitFor(() => {
            expect(api.regenerateQuestion).toHaveBeenCalledWith(1);
        });
    });

    it('shows latest key insights section and allows regenerating key insights', async () => {
        const user = userEvent.setup();
        const currentUserWithHighlightsPermission = {
            ...currentUser,
            permissions: ['regenerate_highlights'] as const,
        };

        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 2,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 2?',
                    questionNumber: 2,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 2,
                    conversationId: 1,
                    type: 'highlight',
                    content: 'Unique ideas\n- Strong long-term view',
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);
        vi.mocked(api.regenerateHighlights).mockResolvedValue({
            highlights: {
                id: 3,
                conversationId: 1,
                type: 'highlight',
                content: 'Regenerated highlights',
                createdAt: new Date().toISOString(),
            },
        } as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUserWithHighlightsPermission as any} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
        });

        const toggle = await screen.findByText('Key Insights');
        await user.click(toggle);

        await waitFor(() => {
            expect(screen.getByText((content) => content.includes('Unique ideas'))).toBeInTheDocument();
        });

        const regenerateHighlightsButton = screen.getByRole('button', { name: 'Regenerate key insights' });
        await user.click(regenerateHighlightsButton);

        await waitFor(() => {
            expect(api.regenerateHighlights).toHaveBeenCalledWith(1);
        });
    });

    it('hides regenerate key insights button without permission', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'Test Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 2,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 2?',
                    questionNumber: 2,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 2,
                    conversationId: 1,
                    type: 'highlight',
                    content: 'Unique ideas\n- Strong long-term view',
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
        });

        const toggle = await screen.findByText('Key Insights');
        await user.click(toggle);

        expect(screen.queryByRole('button', { name: 'Regenerate key insights' })).not.toBeInTheDocument();
    });

    it('shows an edit button next to the title', async () => {
        const inProgressConversation = {
            id: 1,
            title: 'My Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 1,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 1?',
                    questionNumber: 1,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('My Conversation')).toBeInTheDocument();
        });

        expect(screen.getByTitle('Edit title')).toBeInTheDocument();
    });

    it('shows an inline input when the edit title button is clicked', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'My Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 1,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 1?',
                    questionNumber: 1,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('My Conversation')).toBeInTheDocument();
        });

        await user.click(screen.getByTitle('Edit title'));

        expect(screen.getByRole('textbox')).toHaveValue('My Conversation');
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('saves the new title on Save click', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'My Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 1,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 1?',
                    questionNumber: 1,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);
        vi.mocked(api.updateConversationTitle).mockResolvedValue({ title: 'Updated Title' });

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('My Conversation')).toBeInTheDocument();
        });

        await user.click(screen.getByTitle('Edit title'));

        const input = screen.getByRole('textbox');
        await user.clear(input);
        await user.type(input, 'Updated Title');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(api.updateConversationTitle).toHaveBeenCalledWith(1, 'Updated Title');
        });

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('cancels editing without saving on Cancel click', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'My Conversation',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 1,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 1?',
                    questionNumber: 1,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('My Conversation')).toBeInTheDocument();
        });

        await user.click(screen.getByTitle('Edit title'));
        await user.clear(screen.getByRole('textbox'));
        await user.type(screen.getByRole('textbox'), 'Changed but cancel');
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(api.updateConversationTitle).not.toHaveBeenCalled();
        expect(screen.getByText('My Conversation')).toBeInTheDocument();
    });

    it('shows "Conversation not found" with a return button when loading fails', async () => {
        vi.mocked(api.getConversation).mockRejectedValue(new Error('Network error'));

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        // When getConversation throws, conversation stays null and the not-found UI renders
        await waitFor(() => {
            expect(screen.getByText('Conversation not found')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'Return to Dashboard' })).toBeInTheDocument();
    });

    it('shows an inline error when response submission fails', async () => {
        const user = userEvent.setup();

        const inProgressConversation = {
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date().toISOString(),
            completed: false,
            currentQuestionNumber: 1,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 1?',
                    questionNumber: 1,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation as any);
        vi.mocked(api.submitResponse).mockRejectedValue(new Error('Failed to generate question'));

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        const submitButton = await screen.findByTestId('submit-btn');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to generate question')).toBeInTheDocument();
        });
    });
});
