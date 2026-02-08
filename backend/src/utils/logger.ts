import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { getLogLevel } from '../config/env.js';

const level = getLogLevel();

export const logger = pino({
    level,
    redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization'],
        remove: true,
    },
});

export const requestLogger = pinoHttp({
    logger,
    genReqId: (req) => {
        const headerId = req.headers['x-request-id'];
        if (typeof headerId === 'string' && headerId.trim().length > 0) {
            return headerId;
        }
        return randomUUID();
    },
    customProps: (req) => ({
        requestId: (req as { id?: string }).id,
    }),
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
});