import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

interface ConcurrencyLimitOptions {
    max: number;
}

export function concurrencyLimit(options: ConcurrencyLimitOptions) {
    const { max } = options;
    let active = 0;

    return (req: Request, res: Response, next: NextFunction) => {
        if (active >= max) {
            return next(new AppError('Server busy', 503, 'server_busy'));
        }

        active += 1;

        const release = () => {
            if (active > 0) {
                active -= 1;
            }
        };

        res.on('finish', release);
        res.on('close', release);

        return next();
    };
}
