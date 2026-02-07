import { Request, Response, NextFunction } from 'express';
import { Permission } from '../config/permissions.js';
import { getUserStore } from '../stores/user.store.js';
import { User } from '../types.js';

export function requirePermission(permission: Permission) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        const permissions = getUserStore().getUserPermissions(user.id);
        if (!permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission required' });
        }

        return next();
    };
}
