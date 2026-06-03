import type { Command } from 'commander';

export type InteractiveCommandExecutor = (parts: string[]) => Promise<void>;

export function createCommandRegistry(commands: ReadonlyArray<string>): string[] {
  return [...commands];
}

export function createInteractiveCommandExecutor(cli: Command): InteractiveCommandExecutor {
  return async (parts: string[]) => {
    await cli.parseAsync(parts, { from: 'user' });
  };
}

export async function parseCli(cli: Command, argv: string[]): Promise<void> {
  await cli.parseAsync(argv);
}
