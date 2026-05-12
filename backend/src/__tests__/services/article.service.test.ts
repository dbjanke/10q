import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/errors.js';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ARTICLE_TEXT_LENGTH = 100_000;

const mockGetText = vi.hoisted(() => vi.fn());

vi.mock('../../config/article.js', () => ({
  MAX_PDF_SIZE_BYTES,
  MAX_ARTICLE_TEXT_LENGTH,
}));

vi.mock('pdf-parse', () => ({
  // Regular function required: vitest 4.x calls `new impl()` for constructor mocks, which rejects arrow functions.
  PDFParse: vi.fn().mockImplementation(function () { return { getText: mockGetText }; }),
}));

vi.mock('../../services/openai.service.js', () => ({
  generateArticleKeyInsights: vi.fn().mockResolvedValue('• Key insight one\n• Key insight two'),
  generateArticleSummary: vi.fn().mockResolvedValue('This article argues that X.'),
}));

const { processArticle } = await import('../../services/article.service.js');
const { PDFParse } = await import('pdf-parse');
const openaiService = await import('../../services/openai.service.js');

describe('article.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processArticle', () => {
    it('rejects a buffer exceeding MAX_PDF_SIZE_BYTES without calling pdf-parse', async () => {
      const oversized = Buffer.alloc(MAX_PDF_SIZE_BYTES + 1);

      const error = await processArticle(oversized).catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.status).toBe(413);
      expect(PDFParse).not.toHaveBeenCalled();
    });

    it('truncates text exceeding MAX_ARTICLE_TEXT_LENGTH and sets truncated=true', async () => {
      const buffer = Buffer.from('small pdf');
      const longText = 'a'.repeat(MAX_ARTICLE_TEXT_LENGTH + 100);
      mockGetText.mockResolvedValueOnce({ text: longText });

      const result = await processArticle(buffer);
      expect(result.truncated).toBe(true);
      expect(openaiService.generateArticleKeyInsights).toHaveBeenCalledWith('a'.repeat(MAX_ARTICLE_TEXT_LENGTH));
    });

    it('rejects when no text can be extracted from the PDF', async () => {
      const buffer = Buffer.from('scanned pdf');
      mockGetText.mockResolvedValueOnce({ text: '   ' });

      const error = await processArticle(buffer).catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.status).toBe(422);
      expect(openaiService.generateArticleKeyInsights).not.toHaveBeenCalled();
    });

    it('returns keyInsights, summary, and truncated=false for a valid PDF', async () => {
      const buffer = Buffer.from('valid pdf');
      const articleText = 'This is the article content.';
      mockGetText.mockResolvedValueOnce({ text: articleText });

      const result = await processArticle(buffer);

      expect(PDFParse).toHaveBeenCalledWith({ data: buffer });
      expect(openaiService.generateArticleKeyInsights).toHaveBeenCalledWith(articleText);
      expect(openaiService.generateArticleSummary).toHaveBeenCalledWith(
        articleText,
        '• Key insight one\n• Key insight two'
      );
      expect(result).toEqual({
        keyInsights: '• Key insight one\n• Key insight two',
        summary: 'This article argues that X.',
        truncated: false,
      });
    });

    it('accepts a buffer exactly at MAX_PDF_SIZE_BYTES', async () => {
      const buffer = Buffer.alloc(MAX_PDF_SIZE_BYTES);
      mockGetText.mockResolvedValueOnce({ text: 'Some article text.' });

      await expect(processArticle(buffer)).resolves.toBeDefined();
    });

    it('does not truncate text exactly at MAX_ARTICLE_TEXT_LENGTH', async () => {
      const buffer = Buffer.from('valid pdf');
      mockGetText.mockResolvedValueOnce({ text: 'a'.repeat(MAX_ARTICLE_TEXT_LENGTH) });

      const result = await processArticle(buffer);
      expect(result.truncated).toBe(false);
    });

    it('does not truncate an 80,000 character article', async () => {
      const buffer = Buffer.from('valid pdf');
      mockGetText.mockResolvedValueOnce({ text: 'a'.repeat(80_000) });

      const result = await processArticle(buffer);
      expect(result.truncated).toBe(false);
    });

    it('truncates a 160,000 character article and still succeeds', async () => {
      const buffer = Buffer.from('valid pdf');
      mockGetText.mockResolvedValueOnce({ text: 'a'.repeat(160_000) });

      const result = await processArticle(buffer);
      expect(result.truncated).toBe(true);
      expect(openaiService.generateArticleKeyInsights).toHaveBeenCalledWith('a'.repeat(MAX_ARTICLE_TEXT_LENGTH));
    });
  });
});
