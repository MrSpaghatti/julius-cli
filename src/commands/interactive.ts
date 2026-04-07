import { Command } from 'commander';
import * as readline from 'node:readline/promises';
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

      console.log(chalk.blue.bold('\n--- Jules CLI Interactive Mode ---'));
      console.log(chalk.gray('Type "help" for commands, "exit" to quit.'));
      if (currentRepo) {
        console.log(chalk.gray(`Default repo: ${chalk.cyan(currentRepo)}`));
      }
      console.log('');

      const rl = readline.createInterface({ input, output });

      while (true) {
        const prompt = currentRepo ? `julius-cli [${currentRepo}] > ` : 'julius-cli > ';
        const line = await rl.question(chalk.green.bold(prompt));
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

        // SECURITY: Validate command against allowlist to prevent command injection
        const ALLOWED_COMMANDS = new Set([
          'sessions', 's',
          'activities', 'a',
          'auth',
          'sources',
          'wait',
          'config',
          'templates',
          'listen',
        ]);

        const parts = trimmed.split(/\s+/);
        const command = parts[0];

        if (!ALLOWED_COMMANDS.has(command)) {
          console.error(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Supported commands: ' + Array.from(ALLOWED_COMMANDS).join(', ')));
          console.log('');
          continue;
        }

        try {
          console.log(chalk.gray(`Executing: ${trimmed}`));

          const { spawn } = await import('node:child_process');
          await new Promise<void>((resolve) => {
            const scriptPath = process.argv[1];
            if (!scriptPath || !scriptPath.length) {
              console.error(chalk.red('Cannot determine script path'));
              resolve();
              return;
            }

            // Spawn subprocess with user input as arguments
            // Node's spawn handles argument escaping safely
            const cp = spawn('node', [scriptPath, ...parts], { stdio: 'inherit' });
            cp.on('close', () => resolve());
            cp.on('error', (err) => {
              console.error(chalk.red(`Failed to execute command: ${err.message}`));
              resolve();
            });
          });
        } catch (err: any) {
          console.error(chalk.red(`Error: ${err.message}`));
        }
        console.log('');
      }

      rl.close();
      console.log(chalk.blue('Goodbye!'));
    });
}
