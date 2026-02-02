import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let commands: Command[] | null = null;

export function loadCommands(): Command[] {
  if (commands) {
    return commands;
  }

  const commandsPath = join(__dirname, '../../../config/commands.json');
  const commandsData = readFileSync(commandsPath, 'utf-8');
  const parsed = JSON.parse(commandsData);

  commands = parsed.commands;
  return commands!;
}

export function getCommand(questionNumber: number): Command | undefined {
  const allCommands = loadCommands();
  return allCommands.find(cmd => cmd.number === questionNumber);
}
