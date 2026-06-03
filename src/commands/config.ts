import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { InvalidArgsError } from '../utils/errors.js';
import type { OutputFormat } from '../cli/types.js';
import type { CLIConfig } from '../config/types.js';

export function createConfigCommands(): Command {
  const configCmd = new Command('config').description('Manage CLI configuration');

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key (apiKey, apiEndpoint, defaultFormat, defaultPageSize, pollInterval, maxPollAttempts)')
    .argument('<value>', 'Configuration value')
    .action(async (key: string, value: string) => {
      const validKeys: (string)[] = [
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

      if (key === 'apiKey') {
        await config.setApiKey(value);
        output(
          {
            status: 'success',
            key: 'apiKey',
            message: 'API key stored in secure storage',
          },
          'json'
        );
        return;
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
      if (key === 'defaultFormat' && !['json', 'pretty', 'quiet', 'table'].includes(value)) {
        throw new InvalidArgsError(`Value for defaultFormat must be one of: json, pretty, quiet, table`);
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
    .option('--show', 'Show sensitive values unmasked (e.g., apiKey)')
    .action(async (key: string, options: { format: OutputFormat, show?: boolean }) => {
      let value;
      if (key === 'apiKey') {
        value = await config.getApiKey();
        if (!options.show) {
          // Mask it even in 'get' if it's the full key, or just show masked
          if (value && value.length > 8) {
            value = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
          } else if (value) {
            value = '********';
          }
        }
      } else {
        value = config.get(key as keyof CLIConfig);
      }
      
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
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', 'json')
    .action(async (options: { format: OutputFormat }) => {
      const allConfig = config.getAll();
      const apiKey = await config.getApiKey();
      
      // Mask API key in list output for security
      const displayConfig: any = { ...allConfig };
      if (apiKey) {
        if (apiKey.length > 8) {
          displayConfig.apiKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
        } else {
          displayConfig.apiKey = '********';
        }
      } else {
        displayConfig.apiKey = 'none';
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
    .action(async () => {
      const apiKey = await config.getApiKey();
      config.clear();
      if (apiKey) {
        await config.setApiKey(apiKey);
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
