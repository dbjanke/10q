import { Router, Request, Response } from 'express';
import * as conversationService from './services/conversation.service.js';
import * as openaiService from './services/openai.service.js';
import * as exportService from './services/export.service.js';
import { CreateConversationRequest, SubmitResponseRequest } from './types.js';
import { MAX_TITLE_LENGTH, MAX_RESPONSE_LENGTH } from './config/validation.js';
import { getConversationStore } from './stores/conversation.store.js';
import { rateLimit } from './middleware/rateLimit.js';
import { concurrencyLimit } from './middleware/concurrencyLimit.js';
import { requireAuth } from './middleware/auth.js';
import { requirePermission } from './middleware/permissions.js';
import { parseIdParam } from './utils/params.js';
import { logger } from './utils/logger.js';

const router = Router();

const RESPONSE_RATE_LIMIT_WINDOW_MS = Number(process.env.RESPONSE_RATE_LIMIT_WINDOW_MS || 60000);
const RESPONSE_RATE_LIMIT_MAX = Number(process.env.RESPONSE_RATE_LIMIT_MAX || 30);
const MAX_CONCURRENT_SUBMISSIONS = Number(process.env.MAX_CONCURRENT_SUBMISSIONS || 5);

const responseRateLimit = rateLimit({
  windowMs: RESPONSE_RATE_LIMIT_WINDOW_MS,
  max: RESPONSE_RATE_LIMIT_MAX,
});

const responseConcurrencyLimit = concurrencyLimit({
  max: MAX_CONCURRENT_SUBMISSIONS,
});

const REGENERATE_PERMISSION = 'regenerate_summary_question' as const;

// Liveness probe
router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).send('ok');
});

// Readiness probe (checks dependencies)
router.get('/deep-ping', async (_req: Request, res: Response) => {
  const start = Date.now();

  try {
    const store = getConversationStore();
    store.checkHealth();

    const openaiHealth = await openaiService.checkOpenAiHealth();
    const ok = openaiHealth.ok;
    const hasMetricsAuth = Boolean(process.env.METRICS_TOKEN);

    return res.status(ok ? 200 : 503).json({
      ok,
      timestamp: new Date().toISOString(),
      uptimeMs: Math.round(process.uptime() * 1000),
      latencyMs: Date.now() - start,
      dependencies: {
        database: { ok: true },
        openai: openaiHealth,
        metrics: { ok: true, authRequired: hasMetricsAuth },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Deep ping failed');
    return res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      uptimeMs: Math.round(process.uptime() * 1000),
      latencyMs: Date.now() - start,
      dependencies: {
        database: { ok: false },
        metrics: { ok: Boolean(process.env.METRICS_TOKEN), authRequired: Boolean(process.env.METRICS_TOKEN) },
      },
    });
  }
});

router.use(requireAuth);

router.post(
  '/conversations/:id/regenerate-summary',
  requirePermission(REGENERATE_PERMISSION),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const id = parseIdParam(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      const conversation = conversationService.getConversationById(userId, id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (!conversation.completed) {
        return res.status(400).json({ error: 'Conversation not completed' });
      }

      const messages = conversationService.getConversationMessages(id);
      const summary = await openaiService.generateSummary(messages);

      conversationService.deleteConversationMessagesByType(id, 'summary');
      const summaryMessage = conversationService.saveMessage(id, 'summary', summary);
      conversationService.updateConversationSummary(id, summary);

      return res.json({ summary: summaryMessage.content });
    } catch (error) {
      logger.error({ err: error }, 'Error regenerating summary');
      return res.status(500).json({ error: 'Failed to regenerate summary' });
    }
  }
);

router.post(
  '/conversations/:id/regenerate-question',
  requirePermission(REGENERATE_PERMISSION),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const id = parseIdParam(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      const conversation = conversationService.getConversationById(userId, id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (conversation.completed) {
        return res.status(400).json({ error: 'Conversation already completed' });
      }

      const currentQuestionNumber = conversation.currentQuestionNumber;
      if (!currentQuestionNumber || currentQuestionNumber <= 0) {
        return res.status(400).json({ error: 'No active question to regenerate' });
      }

      const hasResponse = conversation.messages.some(
        (message) => message.type === 'response' && message.questionNumber === currentQuestionNumber
      );
      if (hasResponse) {
        return res.status(400).json({ error: 'Cannot regenerate an answered question' });
      }

      const history = conversation.messages.filter((message) => {
        if (message.questionNumber !== currentQuestionNumber) {
          return true;
        }

        return message.type !== 'question' && message.type !== 'response';
      });

      const nextQuestion = await openaiService.generateQuestion(history, currentQuestionNumber);

      conversationService.deleteQuestionMessage(id, currentQuestionNumber);
      const questionMessage = conversationService.saveMessage(
        id,
        'question',
        nextQuestion,
        currentQuestionNumber
      );

      conversationService.updateConversationProgress(id, currentQuestionNumber);

      return res.json({ question: questionMessage });
    } catch (error) {
      logger.error({ err: error }, 'Error regenerating question');
      return res.status(500).json({ error: 'Failed to regenerate question' });
    }
  }
);

// Create new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title } = req.body as CreateConversationRequest;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Enforce maximum title length
    if (title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        error: `Title too long. Maximum length is ${MAX_TITLE_LENGTH} characters.`
      });
    }

    const conversation = conversationService.createConversation(userId, title.trim());

    // Generate first question
    const firstQuestion = await openaiService.generateQuestion([], 1);

    // Save the first question
    const questionMessage = conversationService.saveMessage(
      conversation.id,
      'question',
      firstQuestion,
      1
    );

    // Update conversation progress
    conversationService.updateConversationProgress(conversation.id, 1);

    res.status(201).json({
      conversation,
      firstQuestion: questionMessage,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating conversation');
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get all conversations
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = conversationService.getAllConversations(userId);
    res.json(conversations);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching conversations');
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation by ID
router.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseIdParam(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = conversationService.getConversationById(userId, id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching conversation');
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Delete conversation
router.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseIdParam(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const deleted = conversationService.deleteConversation(userId, id);

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, 'Error deleting conversation');
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Submit response and get next question
router.post(
  '/conversations/:id/response',
  responseRateLimit,
  responseConcurrencyLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const id = parseIdParam(req.params.id);
      const { response } = req.body as SubmitResponseRequest;

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      if (!response || response.trim().length === 0) {
        return res.status(400).json({ error: 'Response is required' });
      }

      // Enforce maximum response length for security/stability
      if (response.length > MAX_RESPONSE_LENGTH) {
        return res.status(400).json({
          error: `Response too long. Maximum length is ${MAX_RESPONSE_LENGTH} characters.`
        });
      }

      const conversation = conversationService.getConversationById(userId, id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (conversation.completed) {
        return res.status(400).json({ error: 'Conversation already completed' });
      }

      const currentQuestionNumber = conversation.currentQuestionNumber;

      // Save user's response
      const responseMessage = conversationService.saveMessage(
        id,
        'response',
        response.trim(),
        currentQuestionNumber
      );

      // Check if we've completed all 10 questions
      if (currentQuestionNumber >= 10) {
        // Generate summary
        const messages = conversationService.getConversationMessages(id);
        const summary = await openaiService.generateSummary(messages);

        // Save summary
        conversationService.saveMessage(id, 'summary', summary);
        conversationService.updateConversationSummary(id, summary);

        return res.json({
          savedResponse: responseMessage,
          isComplete: true,
          summary,
        });
      }

      // Generate next question
      const nextQuestionNumber = currentQuestionNumber + 1;
      const messages = conversationService.getConversationMessages(id);
      const nextQuestion = await openaiService.generateQuestion(messages, nextQuestionNumber);

      // Save next question
      const questionMessage = conversationService.saveMessage(
        id,
        'question',
        nextQuestion,
        nextQuestionNumber
      );

      // Update conversation progress
      conversationService.updateConversationProgress(id, nextQuestionNumber);

      res.json({
        savedResponse: responseMessage,
        nextQuestion: questionMessage,
        isComplete: false,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error submitting response');
      res.status(500).json({ error: 'Failed to submit response' });
    }
  });

// Export conversation to markdown
router.get('/conversations/:id/export', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseIdParam(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = conversationService.getConversationById(userId, id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const markdown = exportService.exportToMarkdown(conversation);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md"`
    );
    res.send(markdown);
  } catch (error) {
    logger.error({ err: error }, 'Error exporting conversation');
    res.status(500).json({ error: 'Failed to export conversation' });
  }
});

export default router;
