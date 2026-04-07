import { Command } from 'commander';
import * as http from 'node:http';
import chalk from 'chalk';
import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { output } from '../output/formatter.js';

export function createListenCommand(): Command {
  return new Command('listen')
    .description('Start a local webhook listener for session updates')
    .option('-p, --port <port>', 'Port to listen on', '8080')
    .option('--register <session-id>', 'Automatically register this listener for a session')
    .option('--host <host>', 'Public host URL for registration (if different from localhost)')
    .action(async (options: { port: string; register?: string; host?: string }) => {
      const port = parseInt(options.port, 10);
      const host = options.host || `http://localhost:${port}`;

      // Security: Limit maximum body size to prevent DOS
      const MAX_BODY_SIZE = 1048576; // 1MB

      const server = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';

          // Validate Content-Length header if present
          const contentLength = parseInt(req.headers['content-length'] || '0', 10);
          if (contentLength > MAX_BODY_SIZE) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            return;
          }

          req.on('data', (chunk) => {
            body += chunk.toString();
            // Kill connection if payload exceeds limit
            if (body.length > MAX_BODY_SIZE) {
              req.destroy();
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Payload too large' }));
            }
          });

          req.on('end', () => {
            // Skip if connection was destroyed
            if (!res.headersSent) {
              try {
                const data = JSON.parse(body);
                console.log(chalk.blue(`\n[${new Date().toLocaleTimeString()}] Webhook received:`));

                if (data.session) {
                  output(data.session, 'pretty', 'session');
                } else if (data.activity) {
                  output(data.activity, 'pretty', 'activity');
                } else {
                  console.log(JSON.stringify(data, null, 2));
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
              } catch (e: any) {
                const errorMsg = e instanceof SyntaxError ? 'Invalid JSON' : 'Processing error';
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: errorMsg }));
              }
            }
          });

          req.on('error', (err) => {
            console.error(chalk.red(`Request error: ${err.message}`));
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      server.listen(port, () => {
        console.log(chalk.green(`Webhook listener started on port ${port}`));
        console.log(chalk.gray(`Endpoint: ${host}`));
        console.log(chalk.gray('Press Ctrl+C to stop\n'));
      });

      if (options.register) {
        try {
          const client = await getClient();
          const api = new SessionsAPI(client);
          await api.registerWebhook(options.register, { url: host });
          console.log(chalk.green(`Successfully registered webhook for session ${options.register}`));
        } catch (err: any) {
          console.error(chalk.red(`Failed to register webhook: ${err.message}`));
        }
      }
    });
}
