import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import * as dotenv from 'dotenv';

let loaded = false;

export function loadEnv(): void {
    if (loaded) return;
    loaded = true;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const envCandidates = [
        join(__dirname, '../../../.env'),
        join(__dirname, '../../.env'),
        join(process.cwd(), '.env'),
    ];

    for (const candidate of envCandidates) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (existsSync(candidate)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const parsed = dotenv.parse(readFileSync(candidate));
            for (const [key, value] of Object.entries(parsed)) {
                // eslint-disable-next-line security/detect-object-injection
                process.env[key] = value;
            }
            break;
        }
    }
}

export function getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
}

export function getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
}

export function getSessionSecret(): string {
    return process.env.SESSION_SECRET || 'dev-session-secret-change-me';
}

export function getCookieSecure(): boolean {
    return getNodeEnv() === 'production' && getFrontendUrl().startsWith('https://');
}

export function isGoogleConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleConfig(): {
    clientId?: string;
    clientSecret?: string;
    callbackUrl: string;
} {
    return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl:
            process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
    };
}
