import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { processArticle } from '../services/article.service.js';
import { isAppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { MAX_PDF_SIZE_BYTES } from '../config/article.js';

const router = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'));
    }
  },
});

router.post('/', (req: Request, res: Response) => {
  upload.single('pdf')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `PDF exceeds the maximum allowed size of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB.`,
        });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    }

    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required.' });
    }

    try {
      const result = await processArticle(req.file.buffer);
      return res.json(result);
    } catch (error) {
      if (isAppError(error)) {
        return res.status(error.status).json({ error: error.message });
      }
      logger.error({ err: error }, 'Error processing article');
      return res.status(500).json({ error: 'Failed to process article.' });
    }
  });
});

export default router;
