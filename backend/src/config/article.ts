export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
// Constrained by account TPM limit (30,000 tokens/min), not the model context window.
// At 5 chars/token, 100,000 chars ≈ 20,000 tokens for article text, within the TPM budget.
export const MAX_ARTICLE_TEXT_LENGTH = 100_000; // characters
