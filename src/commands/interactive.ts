import { Command } from 'commander';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { inferRepo } from '../utils/git.js';
import type { InteractiveCommandExecutor } from '../cli/parser.js';
import { Output } from '../output/manager.js';

export interface InteractiveCommandDependencies {
  commands: ReadonlyArray<string>;
  execute: InteractiveCommandExecutor;
}

export function createInteractiveCommand({ commands, execute }: InteractiveCommandDependencies): Command {
  return new Command('interactive')
    .alias('i')
    .description('Start interactive REPL mode')
    .option('-r, --repo <repo>', 'Default repository for this session')
    .action(async (options: { repo?: string }) => {
      let currentRepo = options.repo;
      if (!currentRepo) {
        try {
          const inferred = inferRepo();
          currentRepo = `${inferred.provider}/${inferred.repo}`;
        } catch (e) {
          // ignore
        }
      }



      const macros: Record<string, string[]> = {};

      Output.info(chalk.blue.bold('\n--- Jules CLI Interactive Mode ---'));
      Output.info(chalk.gray('Type "help" for commands, "exit" to quit.'));
      Output.info(chalk.gray('Macros: "macro <name> <cmd...>" to define, "!<name>" to run.'));
      if (currentRepo) {
        Output.info(chalk.gray(`Default repo: ${chalk.cyan(currentRepo)}`));
      }
      Output.info('');

      const getCommandNames = () => {
        return [...commands, 'exit', 'quit', 'repo', 'macro'];
      };

      const completer = (line: string) => {
        const hits = getCommandNames().filter(c => c.startsWith(line));
        return [hits.length ? hits : getCommandNames(), line];
      };

      const rl = readline.createInterface({
        input,
        output,
        completer,
        prompt: ''
      });

      let isCommandRunning = false;

      rl.on('SIGINT', () => {
        if (isCommandRunning) {
            Output.warn(chalk.yellow('\n[Ctrl+C received. Command is running...]'));
        } else {
          rl.write(null, { ctrl: true, name: 'u' }); // Clear line
          Output.info('');
          const promptText = currentRepo ? `julius-cli [${currentRepo}] > ` : 'julius-cli > ';
          process.stdout.write(chalk.green.bold(promptText));
        }
      });

      const executeCommand = async (parts: string[]) => {
        isCommandRunning = true;
        try {
          await execute(parts);
        } catch (err: any) {
          if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version' || err.code === 'commander.unknownCommand') {
            // expected commander errors that should not crash the REPL
          } else {
            Output.error(chalk.red(`Error: ${err.message}`));
          }
        } finally {
          isCommandRunning = false;
        }
      };

      const ask = (promptText: string): Promise<string> => {
              return new Promise((resolve) => {
                rl.question(chalk.green.bold(promptText), resolve);
              });
            };
      
            const handleRepoCommand = (trimmed: string): boolean => {
              if (!trimmed.startsWith('repo ')) {
                return false;
              }
      
              currentRepo = trimmed.substring(5).trim();
              Output.info(chalk.gray(`Default repo set to: ${chalk.cyan(currentRepo)}`));
              return true;
            };
      
            const handleMacroCommand = (trimmed: string): boolean => {
              if (!trimmed.startsWith('macro ')) {
                return false;
              }
      
              const parts = trimmed.substring(6).trim().split(/\s+/);
              const macroName = parts[0];
              const macroCmd = parts.slice(1);
              if (!macroName || macroCmd.length === 0) {
                Output.error(chalk.red('Usage: macro <name> <command...>'));
                return true;
              }
      
              macros[macroName] = macroCmd;
              Output.info(chalk.gray(`Macro '${macroName}' saved. Run with !${macroName}`));
              return true;
            };
      
            const expandMacro = (parts: string[]): string[] | null => {
              if (!parts[0].startsWith('!')) {
                return parts;
              }
      
              const macroName = parts[0].substring(1);
              if (!macros[macroName]) {
                Output.error(chalk.red(`Unknown macro: ${macroName}`));
                return null;
              }
      
              const expanded = [...macros[macroName], ...parts.slice(1)];
              Output.info(chalk.gray(`Expanded macro: ${expanded.join(' ')}`));
              return expanded;
            };
      
            const shouldSkipCommand = (command: string): boolean => {
              if (command === 'interactive' || command === 'i') {
                Output.error(chalk.red(`Already in interactive mode.`));
                return true;
              }
      
              return false;
            };

      const loop = async () => {
        while (true) {
          const promptText = currentRepo ? `julius-cli [${currentRepo}] > ` : 'julius-cli > ';
          const line = await ask(promptText);
          const trimmed = line.trim();

          if (trimmed === 'exit' || trimmed === 'quit') {
            break;
          }

          if (trimmed === '') {
            continue;
          }

          if (handleRepoCommand(trimmed)) {
            continue;
          }

          if (handleMacroCommand(trimmed)) {
            continue;
          }

          const expanded = expandMacro(trimmed.split(/\s+/));
          if (!expanded) {
            continue;
          }

          const parts = expanded;
          const command = parts[0];

          if (shouldSkipCommand(command)) {
            continue;
          }

          await executeCommand(parts);
          Output.info('');
        }

        rl.close();
        Output.info(chalk.blue('Goodbye!'));
      };

      await loop();
    });
}
