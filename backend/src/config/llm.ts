import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LlmConfig {
  temperature: number;
  maxTokens: {
    question: number;
    summary: number;
    keyInsights: number;
  };
}

let config: LlmConfig | null = null;

export function loadLlmConfig(): LlmConfig {
  if (config) return config;
  const configPath = join(__dirname, '../../../config/llm.json');
  config = JSON.parse(readFileSync(configPath, 'utf-8')) as LlmConfig;
  return config;
}
