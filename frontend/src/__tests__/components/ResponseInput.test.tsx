import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponseInput from '../../components/ResponseInput';

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
});
