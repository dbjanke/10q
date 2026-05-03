import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyInsights from '../../components/KeyInsights';
import { Message } from '../../types';

const mockHighlight: Message = {
    id: 10,
    conversationId: 1,
    type: 'highlight',
    content: '- Key point one\n- Key point two',
    createdAt: new Date().toISOString(),
};

describe('KeyInsights', () => {
    it('renders highlight content when a highlight is provided', () => {
        render(<KeyInsights highlight={mockHighlight} />);
        expect(screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === mockHighlight.content)).toBeInTheDocument();
    });

    it('renders empty state when no highlight is provided', () => {
        render(<KeyInsights />);
        expect(screen.getByText(/No key insights yet/)).toBeInTheDocument();
    });

    it('does not show regenerate button when canRegenerate is false', () => {
        render(<KeyInsights highlight={mockHighlight} canRegenerate={false} />);
        expect(screen.queryByRole('button', { name: /regenerate key insights/i })).not.toBeInTheDocument();
    });

    it('shows regenerate button when canRegenerate is true', () => {
        render(<KeyInsights highlight={mockHighlight} canRegenerate={true} onRegenerate={vi.fn()} />);
        expect(screen.getByRole('button', { name: /regenerate key insights/i })).toBeInTheDocument();
    });

    it('calls onRegenerate when the regenerate button is clicked', async () => {
        const user = userEvent.setup();
        const onRegenerate = vi.fn();
        render(<KeyInsights highlight={mockHighlight} canRegenerate={true} onRegenerate={onRegenerate} />);

        await user.click(screen.getByRole('button', { name: /regenerate key insights/i }));

        expect(onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('disables the button while regenerating', () => {
        render(<KeyInsights canRegenerate={true} regenerating={true} onRegenerate={vi.fn()} />);
        const button = screen.getByRole('button', { name: /regenerating/i });
        expect(button).toBeDisabled();
    });

    it('disables the button when disabled prop is set', () => {
        render(<KeyInsights canRegenerate={true} disabled={true} onRegenerate={vi.fn()} />);
        expect(screen.getByRole('button', { name: /regenerate key insights/i })).toBeDisabled();
    });
});
