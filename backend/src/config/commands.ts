import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let commands: Command[] | null = null;
let insightsPrompt: string | null = null;
let numOptions: number | null = null;

interface CommandsConfig {
  commands: Command[];
  insightsPrompt: string;
  numOptions: number;
}

function loadCommandConfig(): CommandsConfig {
  const commandsPath = join(__dirname, '../../../config/commands.json');
  const commandsData = readFileSync(commandsPath, 'utf-8');
  return JSON.parse(commandsData) as CommandsConfig;
}

export function loadCommands(): Command[] {
  if (commands) {
    return commands;
  }

  const parsed = loadCommandConfig();

  commands = parsed.commands;
  insightsPrompt = parsed.insightsPrompt;
  numOptions = parsed.numOptions;
  return commands!;
}

export function getNumOptions(): number {
  if (numOptions !== null) {
    return numOptions;
  }

  const parsed = loadCommandConfig();
  commands = parsed.commands;
  insightsPrompt = parsed.insightsPrompt;
  numOptions = parsed.numOptions;
  return numOptions;
}

export function getInsightsPrompt(): string {
  if (insightsPrompt) {
    return insightsPrompt;
  }

  const parsed = loadCommandConfig();
  commands = parsed.commands;
  insightsPrompt = parsed.insightsPrompt;

  if (!insightsPrompt) {
    throw new Error('No insightsPrompt found in commands config');
  }

  return insightsPrompt;
}

export function getCommand(questionNumber: number): Command | undefined {
  const allCommands = loadCommands();
  return allCommands.find(cmd => cmd.number === questionNumber);
}
