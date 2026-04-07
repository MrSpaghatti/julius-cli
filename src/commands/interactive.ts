import { Command } from 'commander';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { cli } from '../cli.js';
import { inferRepo } from '../utils/git.js';

export function createInteractiveCommand(): Command {
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

      const context: Record<string, any> = {
        lastSessionId: undefined,
      };

      const macros: Record<string, string[]> = {};

      console.log(chalk.blue.bold('\n--- Jules CLI Interactive Mode ---'));
      console.log(chalk.gray('Type "help" for commands, "exit" to quit.'));
      console.log(chalk.gray('Macros: "macro <name> <cmd...>" to define, "!<name>" to run.'));
      if (currentRepo) {
        console.log(chalk.gray(`Default repo: ${chalk.cyan(currentRepo)}`));
      }
      console.log('');

      const getCommandNames = () => {
        return cli.commands.map(cmd => cmd.name()).concat(['exit', 'quit', 'repo', 'macro']);
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
          console.log(chalk.yellow('\n[Ctrl+C received. Command is running...]'));
        } else {
          rl.write(null, { ctrl: true, name: 'u' }); // Clear line
          console.log();
          const promptText = currentRepo ? `julius-cli [${currentRepo}] > ` : 'julius-cli > ';
          process.stdout.write(chalk.green.bold(promptText));
        }
      });

      const executeCommand = async (parts: string[]) => {
        isCommandRunning = true;
        try {
          // Using parseAsync in-process. 
          await cli.parseAsync(parts, { from: 'user' });
        } catch (err: any) {
          if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version' || err.code === 'commander.unknownCommand') {
            // expected commander errors that should not crash the REPL
          } else {
            console.error(chalk.red(`Error: ${err.message}`));
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

          if (trimmed.startsWith('repo ')) {
            currentRepo = trimmed.substring(5).trim();
            console.log(chalk.gray(`Default repo set to: ${chalk.cyan(currentRepo)}`));
            continue;
          }

          if (trimmed.startsWith('macro ')) {
            const parts = trimmed.substring(6).trim().split(/\s+/);
            const macroName = parts[0];
            const macroCmd = parts.slice(1);
            if (!macroName || macroCmd.length === 0) {
              console.error(chalk.red('Usage: macro <name> <command...>'));
            } else {
              macros[macroName] = macroCmd;
              console.log(chalk.gray(`Macro '${macroName}' saved. Run with !${macroName}`));
            }
            continue;
          }

          let parts = trimmed.split(/\s+/);

          if (parts[0].startsWith('!')) {
            const macroName = parts[0].substring(1);
            if (macros[macroName]) {
              parts = [...macros[macroName], ...parts.slice(1)];
              console.log(chalk.gray(`Expanded macro: ${parts.join(' ')}`));
            } else {
              console.error(chalk.red(`Unknown macro: ${macroName}`));
              continue;
            }
          }

          const command = parts[0];

          if (command === 'interactive' || command === 'i') {
            console.error(chalk.red(`Already in interactive mode.`));
            continue;
          }

          await executeCommand(parts);
          console.log('');
        }

        rl.close();
        console.log(chalk.blue('Goodbye!'));
      };

      await loop();
    });
}
