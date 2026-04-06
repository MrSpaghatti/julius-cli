import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { InvalidArgsError } from '../utils/errors.js';
import type { OutputFormat, CLIConfig } from '../api/types.js';

export function createConfigCommands(): Command {
  const configCmd = new Command('config').description('Manage CLI configuration');

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key (apiKey, apiEndpoint, defaultFormat, defaultPageSize, pollInterval, maxPollAttempts)')
    .argument('<value>', 'Configuration value')
    .action((key: string, value: string) => {
      const validKeys: (keyof CLIConfig)[] = [
        'apiKey',
        'apiEndpoint',
        'defaultFormat',
        'defaultPageSize',
        'pollInterval',
        'maxPollAttempts',
      ];

      if (!validKeys.includes(key as any)) {
        throw new InvalidArgsError(`Invalid config key: ${key}. Valid keys: ${validKeys.join(', ')}`);
      }

      let parsedValue: any = value;

      // Handle numeric values
      if (['defaultPageSize', 'pollInterval', 'maxPollAttempts'].includes(key)) {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          throw new InvalidArgsError(`Value for ${key} must be a number`);
        }
      }

      // Handle enum values
      if (key === 'defaultFormat' && !['json', 'pretty', 'quiet'].includes(value)) {
        throw new InvalidArgsError(`Value for defaultFormat must be one of: json, pretty, quiet`);
      }

      config.set(key as keyof CLIConfig, parsedValue);

      output(
        {
          status: 'success',
          key,
          value: parsedValue,
        },
        'json'
      );
    });

  configCmd
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action((key: string, options: { format: OutputFormat }) => {
      const value = config.get(key as keyof CLIConfig);
      
      output(
        {
          key,
          value,
        },
        options.format
      );
    });

  configCmd
    .command('list')
    .description('List all configuration values')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action((options: { format: OutputFormat }) => {
      const allConfig = config.getAll();
      
      // Mask API key in list output for security
      const displayConfig = { ...allConfig };
      if (displayConfig.apiKey) {
        const key = displayConfig.apiKey;
        if (key.length > 8) {
          displayConfig.apiKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
        } else {
          displayConfig.apiKey = '********';
        }
      }

      output(
        {
          config: displayConfig,
        },
        options.format
      );
    });

  configCmd
    .command('reset')
    .description('Reset configuration to defaults (keeps API key)')
    .action(() => {
      const apiKey = config.get('apiKey');
      config.clear();
      if (apiKey) {
        config.set('apiKey', apiKey);
      }

      output(
        {
          status: 'success',
          message: 'Configuration reset to defaults',
        },
        'json'
      );
    });

  return configCmd;
}
