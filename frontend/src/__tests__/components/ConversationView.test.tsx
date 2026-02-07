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
        <button onClick={() => onSubmit('Test response')} disabled={disabled} data-testid="submit-btn">
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
        const submitButton = screen.getByTestId('submit-btn');
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

    it('should not reload conversation for non-final responses', async () => {
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

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation);

        vi.mocked(api.submitResponse).mockResolvedValue({
            savedResponse: {
                id: 2,
                conversationId: 1,
                type: 'response',
                content: 'Response 5',
                questionNumber: 5,
                createdAt: new Date().toISOString(),
            },
            nextQuestion: {
                id: 3,
                conversationId: 1,
                type: 'question',
                content: 'Question 6?',
                questionNumber: 6,
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

        expect(api.getConversation).toHaveBeenCalledTimes(1);

        // Submit a non-final response
        const submitButton = screen.getByTestId('submit-btn');
        await user.click(submitButton);

        // Wait a bit to ensure no additional reload happens
        await waitFor(() => {
            expect(api.submitResponse).toHaveBeenCalled();
        });

        // Should still only have 1 call to getConversation (no reload)
        expect(api.getConversation).toHaveBeenCalledTimes(1);
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

        vi.mocked(api.getConversation).mockResolvedValue(inProgressConversation);

        // Mock a slow API response to test loading state
        let resolveSubmit: any;
        const submitPromise = new Promise((resolve) => {
            resolveSubmit = resolve;
        });

        vi.mocked(api.submitResponse).mockReturnValue(submitPromise as any);

        render(
            <BrowserRouter>
                <ConversationView currentUser={currentUser} onLogout={vi.fn()} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Conversation')).toBeInTheDocument();
        });

        // Initially, loading indicator should not be visible
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        expect(screen.getByTestId('submit-btn')).toBeInTheDocument();

        // Click submit button
        const submitButton = screen.getByTestId('submit-btn');
        await user.click(submitButton);

        // Loading indicator should appear, submit button should disappear
        await waitFor(() => {
            expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('submit-btn')).not.toBeInTheDocument();

        // Resolve the API call
        resolveSubmit({
            savedResponse: {
                id: 2,
                conversationId: 1,
                type: 'response',
                content: 'Response 5',
                questionNumber: 5,
                createdAt: new Date().toISOString(),
            },
            nextQuestion: {
                id: 3,
                conversationId: 1,
                type: 'question',
                content: 'Question 6?',
                questionNumber: 6,
                createdAt: new Date().toISOString(),
            },
            isComplete: false,
        });

        // Loading indicator should disappear, submit button should reappear
        await waitFor(() => {
            expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
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

        const regenButton = screen.getByRole('button', { name: 'Regenerate question' });
        await user.click(regenButton);

        await waitFor(() => {
            expect(api.regenerateQuestion).toHaveBeenCalledWith(1);
        });
    });
});
