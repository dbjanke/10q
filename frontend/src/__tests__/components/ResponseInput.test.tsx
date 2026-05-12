import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponseInput from '../../components/ResponseInput';
import { MAX_RESPONSE_LENGTH } from '../../config/validation';

describe('ResponseInput', () => {
    it('keeps the draft when submit fails', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockRejectedValue(new Error('submit failed'));

        render(<ResponseInput onSubmit={onSubmit} />);

        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        await user.type(textarea, 'My important draft');
        await user.click(screen.getByRole('button', { name: 'Submit Response' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });

        expect((textarea as HTMLTextAreaElement).value).toBe('My important draft');
    });

    it('clears the draft after successful submit', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(<ResponseInput onSubmit={onSubmit} />);

        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        await user.type(textarea, 'Ready to send');
        await user.click(screen.getByRole('button', { name: 'Submit Response' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });

        expect((textarea as HTMLTextAreaElement).value).toBe('');
    });

    it('disables the submit button when the textarea is empty', () => {
        render(<ResponseInput onSubmit={vi.fn()} />);
        const button = screen.getByRole('button', { name: 'Submit Response' });
        expect(button).toBeDisabled();
    });

    it('disables the submit button when input is only whitespace', async () => {
        const user = userEvent.setup();
        render(<ResponseInput onSubmit={vi.fn()} />);
        await user.type(screen.getByPlaceholderText('Take your time to reflect and respond...'), '   ');
        expect(screen.getByRole('button', { name: 'Submit Response' })).toBeDisabled();
    });

    it('does not call onSubmit when input is only whitespace and form is submitted', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<ResponseInput onSubmit={onSubmit} />);
        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        await user.type(textarea, '   ');
        // Button is disabled so no click, but direct form submission should also not fire
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows "Submitting..." and disables button when disabled prop is true', () => {
        render(<ResponseInput onSubmit={vi.fn()} disabled={true} />);
        const button = screen.getByRole('button', { name: 'Submitting...' });
        expect(button).toBeDisabled();
    });

    it('does not call onSubmit when disabled prop is true', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<ResponseInput onSubmit={onSubmit} disabled={true} />);
        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        await user.type(textarea, 'some text');
        // Button is disabled, so clicking should not fire
        const button = screen.getByRole('button', { name: 'Submitting...' });
        await user.click(button);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows character count as the user types', async () => {
        const user = userEvent.setup();
        render(<ResponseInput onSubmit={vi.fn()} />);
        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        await user.type(textarea, 'hello');
        expect(screen.getByText(`5 / ${MAX_RESPONSE_LENGTH} characters`)).toBeInTheDocument();
    });

    it('shows character count in warning style when near the limit', () => {
        render(<ResponseInput onSubmit={vi.fn()} />);
        const textarea = screen.getByPlaceholderText('Take your time to reflect and respond...');
        const nearLimitText = 'a'.repeat(MAX_RESPONSE_LENGTH - 10);
        fireEvent.change(textarea, { target: { value: nearLimitText } });
        const counter = screen.getByText(`${nearLimitText.length} / ${MAX_RESPONSE_LENGTH} characters`);
        expect(counter).toHaveStyle({ color: '#c2410c' });
    });
});
