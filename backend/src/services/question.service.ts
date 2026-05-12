import * as conversationService from './conversation.service.js';
import * as openaiService from './openai.service.js';
import { getCommand, getNumOptions } from '../config/commands.js';
import { Message } from '../types.js';

function questionCount(questionNumber: number): number {
    return getCommand(questionNumber)?.staticQuestion ? 1 : getNumOptions();
}

function persistQuestionOptions(
    conversationId: number,
    questionNumber: number,
    options: string[]
): void {
    options.forEach((content) =>
        conversationService.saveMessage(conversationId, 'question', content, questionNumber)
    );
}

export async function generateAndPersistQuestionOptions(
    conversationId: number,
    questionNumber: number,
    history: Message[],
    highlights?: string
): Promise<void> {
    const questions = await openaiService.generateQuestion(
        history,
        questionNumber,
        highlights,
        questionCount(questionNumber)
    );
    conversationService.deleteQuestionMessage(conversationId, questionNumber);
    persistQuestionOptions(conversationId, questionNumber, questions);
    conversationService.updateConversationProgress(conversationId, questionNumber);
}
