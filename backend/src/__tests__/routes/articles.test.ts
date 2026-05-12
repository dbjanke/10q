import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import articleRoutes from '../../routes/articles.js';
import { AppError } from '../../utils/errors.js';

vi.mock('../../services/article.service.js', () => ({
  processArticle: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const { processArticle } = await import('../../services/article.service.js');

const SMALL_PDF = Buffer.from('%PDF-1.4 test content');

describe('POST /articles', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/articles', articleRoutes);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when no file is provided', async () => {
    const res = await request(app).post('/articles');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when a non-PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/articles')
      .attach('pdf', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
  });

  it('returns 413 when processArticle throws a 413 AppError', async () => {
    vi.mocked(processArticle).mockRejectedValueOnce(
      new AppError('PDF exceeds the maximum allowed size.', 413)
    );

    const res = await request(app)
      .post('/articles')
      .attach('pdf', SMALL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toBeDefined();
  });

  it('returns 422 when processArticle throws a 422 AppError', async () => {
    vi.mocked(processArticle).mockRejectedValueOnce(
      new AppError('No text could be extracted from this PDF.', 422)
    );

    const res = await request(app)
      .post('/articles')
      .attach('pdf', SMALL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  it('returns 500 when processArticle throws an unexpected error', async () => {
    vi.mocked(processArticle).mockRejectedValueOnce(new Error('Unexpected failure'));

    const res = await request(app)
      .post('/articles')
      .attach('pdf', SMALL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('returns 200 with keyInsights, summary, and truncated on success', async () => {
    const mockResult = {
      keyInsights: '• Insight one\n• Insight two',
      summary: 'This article argues that X.',
      truncated: false,
    };
    vi.mocked(processArticle).mockResolvedValueOnce(mockResult);

    const res = await request(app)
      .post('/articles')
      .attach('pdf', SMALL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockResult);
    expect(processArticle).toHaveBeenCalledWith(expect.any(Buffer));
  });
});
