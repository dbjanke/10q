import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SystemPrompts } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
