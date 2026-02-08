import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { handleGoogleLogin } from '../services/auth.service.js';
import { getUserStore } from '../stores/user.store.js';
import { User } from '../types.js';
import { getGoogleConfig } from '../config/env.js';

export function configurePassport(): void {
    const { clientId, clientSecret, callbackUrl } = getGoogleConfig();

    passport.serializeUser((user: User, done: (err: unknown, id?: number) => void) => {
        done(null, user.id);
    });

    passport.deserializeUser((id: number, done: (err: unknown, user?: User | false) => void) => {
        try {
            const user = getUserStore().getUserById(Number(id));
            if (!user) {
                return done(null, false);
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    });

    passport.use(
        new GoogleStrategy(
            {
                clientID: clientId,
                clientSecret: clientSecret,
                callbackURL: callbackUrl,
                state: true,
            },
            (
                _accessToken: string,
                _refreshToken: string,
                profile: Profile,
                done: VerifyCallback
            ) => {
                try {
                    const user = handleGoogleLogin(profile);
                    if (!user) {
                        return done(null, false, { message: 'not_allowed' });
                    }
                    return done(null, user);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );
}
