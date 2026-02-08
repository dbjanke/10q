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
        // Candidate paths are fixed, internal repo-relative locations.
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (existsSync(candidate)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const parsed = dotenv.parse(readFileSync(candidate));
            for (const [key, value] of Object.entries(parsed)) {
                // Keys come from a local .env file we control; avoid overriding real env.
                // eslint-disable-next-line security/detect-object-injection
                if (process.env[key] === undefined) {
                    // eslint-disable-next-line security/detect-object-injection
                    process.env[key] = value;
                }
            }
            break;
        }
    }
}

function requireEnv(key: string): string {
    // eslint-disable-next-line security/detect-object-injection
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export function validateEnv(): void {
    const nodeEnv = requireEnv('NODE_ENV');
    requireEnv('FRONTEND_URL');
    requireEnv('SESSION_SECRET');

    if (nodeEnv !== 'test') {
        requireEnv('GOOGLE_CLIENT_ID');
        requireEnv('GOOGLE_CLIENT_SECRET');
        requireEnv('GOOGLE_CALLBACK_URL');
    }
}

export function getNodeEnv(): string {
    return requireEnv('NODE_ENV');
}

export function getFrontendUrl(): string {
    return requireEnv('FRONTEND_URL');
}

export function getSessionSecret(): string {
    return requireEnv('SESSION_SECRET');
}

export function getCookieSecure(): boolean {
    return getNodeEnv() === 'production' && getFrontendUrl().startsWith('https://');
}

export function getLogLevel(): string {
    const nodeEnv = process.env.NODE_ENV;
    return process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');
}

export function isGoogleConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleConfig(): {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
} {
    return {
        clientId: requireEnv('GOOGLE_CLIENT_ID'),
        clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
        callbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),
    };
}
