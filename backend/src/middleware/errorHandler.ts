import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (typeof err === 'object' && err && 'code' in err && err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    if (isAppError(err)) {
        return res.status(err.status).json({
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
        });
    }

    logger.error({ err }, 'Unhandled error');
    return res.status(500).json({ error: 'Internal server error' });
}