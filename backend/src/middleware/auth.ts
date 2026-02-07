import { Request, Response, NextFunction } from 'express';
import { User } from '../types.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User | undefined;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
}
