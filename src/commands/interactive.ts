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
        const prompt = currentRepo ? `jules-cli [${currentRepo}] > ` : 'jules-cli > ';
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

        // Prepare args for commander
        const args = trimmed.split(/\s+/);
        
        // If the command is a sub-command of sessions/activities, 
        // and currentRepo is set, and --repo is not already present,
        // we can try to inject it.
        // This is a bit complex to do perfectly with commander's internals.
        
        // For now, let's just try to parse the command
        try {
          // Create a new command instance to avoid global state issues
          // Wait, cli is already populated with all commands.
          // We can't easily re-parse from the root because of 'interactive' being the current command.
          
          // Actually, we should probably only allow subcommands here.
          // But commander doesn't easily support re-parsing a string on an existing command tree 
          // that is already executing.
          
          // Let's try a simpler approach: use a child process or just run the commands directly if we can.
          // But running them directly means we need to import all of them.
          
          // Let's use 'parseAsync' but we need to be careful with process.exit
          
          const fullArgs = ['node', 'jules-cli', ...args];
          
          // Inject --repo if it's a sessions command and not provided
          if (currentRepo && (args[0] === 'sessions' || args[0] === 's')) {
            if (!args.includes('--repo') && !args.includes('-r')) {
               // find where to inject it. Usually after the subcommand.
               if (args.length > 1) {
                  fullArgs.splice(4, 0, '--repo', currentRepo);
               }
            }
          }

          // We need to bypass process.exit if commander tries to exit on help or error
          // This is tricky.
          
          // Alternative: call the handlers directly. But that requires re-implementing 
          // a lot of commander's logic for options parsing.
          
          console.log(chalk.gray(`Executing: ${args.join(' ')}`));
          
          // For now, let's just spawn ourselves as a subprocess to keep it clean and simple
          // and avoid polluting the current process's commander state.
          
          // Wait, spawning a subprocess is slow. 
          // Let's try to use the library-level command objects.
          
          await cli.parseAsync(fullArgs);
          
        } catch (err: any) {
          if (err.code === 'commander.helpDisplayed' || err.code === 'commander.unknownCommand') {
            // ignore
          } else {
             console.error(chalk.red(`Error: ${err.message}`));
          }
        }
        console.log('');
      }

      rl.close();
      console.log(chalk.blue('Goodbye!'));
    });
}
