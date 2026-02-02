import { describe, it, expect } from 'vitest';
import { MAX_TITLE_LENGTH, MAX_RESPONSE_LENGTH } from '../../config/validation.js';

describe('Validation Constants', () => {
    describe('MAX_TITLE_LENGTH', () => {
        it('should be defined', () => {
            expect(MAX_TITLE_LENGTH).toBeDefined();
        });

        it('should be a positive number', () => {
            expect(MAX_TITLE_LENGTH).toBeGreaterThan(0);
        });

        it('should be reasonable for a title (not too short or long)', () => {
            expect(MAX_TITLE_LENGTH).toBeGreaterThanOrEqual(20);
            expect(MAX_TITLE_LENGTH).toBeLessThanOrEqual(500);
        });
    });

    describe('MAX_RESPONSE_LENGTH', () => {
        it('should be defined', () => {
            expect(MAX_RESPONSE_LENGTH).toBeDefined();
        });

        it('should be a positive number', () => {
            expect(MAX_RESPONSE_LENGTH).toBeGreaterThan(0);
        });

        it('should be reasonable for a thoughtful response', () => {
            expect(MAX_RESPONSE_LENGTH).toBeGreaterThanOrEqual(500);
            expect(MAX_RESPONSE_LENGTH).toBeLessThanOrEqual(10000);
        });

        it('should be larger than MAX_TITLE_LENGTH', () => {
            expect(MAX_RESPONSE_LENGTH).toBeGreaterThan(MAX_TITLE_LENGTH);
        });
    });
});
