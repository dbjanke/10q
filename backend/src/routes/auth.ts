import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { requireAuth } from '../middleware/auth.js';
import { getFrontendUrl, isGoogleConfigured } from '../config/env.js';
import { User } from '../types.js';

const router = Router();

function sanitizeUser(user: User) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
    };
}

router.get('/google', (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleConfigured()) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
    }
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleConfigured()) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
    }
    passport.authenticate('google', (err: unknown, user: User | false, info?: { message?: string }) => {
        if (err) {
            console.error('Google OAuth error:', err);
            return res.redirect(`${getFrontendUrl()}/login?error=auth_failed`);
        }

        if (!user) {
            const error = info?.message === 'not_allowed' ? 'not_allowed' : 'auth_failed';
            return res.redirect(`${getFrontendUrl()}/login?error=${encodeURIComponent(error)}`);
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }
            return res.redirect(getFrontendUrl());
        });
    })(req, res, next);
});

router.get('/me', (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    return res.json({ user: sanitizeUser(req.user as User) });
});

router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        if (req.session) {
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    return next(destroyErr);
                }
                res.status(204).send();
            });
            return;
        }

        res.status(204).send();
    });
});

export default router;
