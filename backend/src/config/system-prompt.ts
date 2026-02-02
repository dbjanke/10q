import { readFileSync } from 'fs';
import { join } from 'path';
import { SystemPrompts } from '../types';

let systemPrompts: SystemPrompts | null = null;

export function loadSystemPrompts(): SystemPrompts {
  if (systemPrompts) {
    return systemPrompts;
  }

  const promptsPath = join(__dirname, '../../../config/system-prompts.json');
  const promptsData = readFileSync(promptsPath, 'utf-8');

  systemPrompts = JSON.parse(promptsData);
  return systemPrompts!;
}
