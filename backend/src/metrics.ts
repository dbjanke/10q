import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { timingSafeEqual } from 'crypto';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

const httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP error responses',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

function getRouteLabel(req: Request): string {
    const routePath = req.route?.path;
    if (routePath) {
        return `${req.baseUrl}${routePath}`;
    }
    return req.path;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const statusCode = res.statusCode.toString();
        const route = getRouteLabel(req);

        httpRequestDurationSeconds.labels(req.method, route, statusCode).observe(durationSeconds);
        httpRequestsTotal.labels(req.method, route, statusCode).inc();

        if (res.statusCode >= 500) {
            httpErrorsTotal.labels(req.method, route, statusCode).inc();
        }
    });

    next();
}

function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    const len = Math.max(aBuf.length, bBuf.length);
    const aPadded = Buffer.alloc(len);
    const bPadded = Buffer.alloc(len);
    aBuf.copy(aPadded);
    bBuf.copy(bPadded);
    const equal = timingSafeEqual(aPadded, bPadded);
    return equal && aBuf.length === bBuf.length;
}

function authorizeMetrics(req: Request, res: Response): boolean {
    const token = process.env.METRICS_TOKEN;
    if (!token) {
        return true;
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }

    const provided = header.slice('Bearer '.length).trim();
    if (!safeEqual(provided, token)) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }

    return true;
}

export async function metricsEndpoint(req: Request, res: Response) {
    if (!authorizeMetrics(req, res)) {
        return;
    }

    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}