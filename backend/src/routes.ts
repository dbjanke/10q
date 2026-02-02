import { Router, Request, Response } from 'express';
import * as conversationService from './services/conversation.service';
import * as openaiService from './services/openai.service';
import * as exportService from './services/export.service';
import { CreateConversationRequest, SubmitResponseRequest } from './types';

const router = Router();

// Create new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { title } = req.body as CreateConversationRequest;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const conversation = conversationService.createConversation(title.trim());

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
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get all conversations
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const conversations = conversationService.getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation by ID
router.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = conversationService.getConversationById(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Delete conversation
router.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const deleted = conversationService.deleteConversation(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Submit response and get next question
router.post('/conversations/:id/response', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { response } = req.body as SubmitResponseRequest;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const conversation = conversationService.getConversationById(id);

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
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Export conversation to markdown
router.get('/conversations/:id/export', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = conversationService.getConversationById(id);

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
    console.error('Error exporting conversation:', error);
    res.status(500).json({ error: 'Failed to export conversation' });
  }
});

export default router;
