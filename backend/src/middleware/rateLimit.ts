import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
    const { windowMs, max, keyGenerator } = options;
    const store = new Map<string, RateLimitEntry>();

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
        const now = Date.now();
        const existing = store.get(key);

        if (!existing || now > existing.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (existing.count >= max) {
            return next(new AppError('Too many requests', 429, 'rate_limit'));
        }

        existing.count += 1;
        store.set(key, existing);
        return next();
    };
}
