declare module 'better-sqlite3-session-store' {
    import type { SessionOptions } from 'express-session';

    type SessionStoreFactory = (session: unknown) => new (options: SessionOptions & {
        client: unknown;
        expired?: {
            clear?: boolean;
            intervalMs?: number;
        };
    }) => unknown;

    const factory: SessionStoreFactory;
    export default factory;
}

export { };
