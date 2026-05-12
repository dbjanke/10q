import { PDFParse } from 'pdf-parse';
import { MAX_PDF_SIZE_BYTES, MAX_ARTICLE_TEXT_LENGTH } from '../config/article.js';
import { generateArticleKeyInsights, generateArticleSummary } from './openai.service.js';
import { AppError } from '../utils/errors.js';

export interface ArticleContext {
  keyInsights: string;
  summary: string;
  truncated: boolean;
}

export async function processArticle(buffer: Buffer): Promise<ArticleContext> {
  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    throw new AppError(
      `PDF exceeds the maximum allowed size of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB.`,
      413
    );
  }

  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  const text = parsed.text.trim();

  if (!text) {
    throw new AppError('No text could be extracted from this PDF.', 422);
  }

  const truncated = text.length > MAX_ARTICLE_TEXT_LENGTH;
  const articleText = truncated ? text.slice(0, MAX_ARTICLE_TEXT_LENGTH) : text;

  const keyInsights = await generateArticleKeyInsights(articleText);
  const summary = await generateArticleSummary(articleText, keyInsights);

  return { keyInsights, summary, truncated };
}
