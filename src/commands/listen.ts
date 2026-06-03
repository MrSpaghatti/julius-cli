import { Command } from 'commander';
import * as http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import chalk from 'chalk';
import localtunnel from 'localtunnel';
import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { output } from '../output/formatter.js';

export function createListenCommand(): Command {
  return new Command('listen')
    .description('Start a local webhook listener for session updates')
    .option('-p, --port <port>', 'Port to listen on', '8080')
    .option('--register <session-id>', 'Automatically register this listener for a session')
    .option('--host <host>', 'Public host URL for registration (if different from localhost)')
    .option('--secret <secret>', 'Secret key for HMAC signature verification (optional)')
    .option('--tunnel', 'Create a public tunnel for the local port using localtunnel')
    .action(async (options: { port: string; register?: string; host?: string; secret?: string; tunnel?: boolean }) => {
      const port = parseInt(options.port, 10);
      let host = options.host || `http://localhost:${port}`;
      const secret = options.secret;

      let tunnel: localtunnel.Tunnel | undefined;
      if (options.tunnel) {
        try {
          console.log(chalk.blue('Creating tunnel...'));
          tunnel = await localtunnel({ port });
          host = tunnel.url;
          console.log(chalk.green(`Tunnel created: ${host}`));
          
          tunnel.on('close', () => {
            console.log(chalk.yellow('\nTunnel closed.'));
          });
          
          tunnel.on('error', (err) => {
            console.error(chalk.red(`\nTunnel error: ${err.message}`));
          });
        } catch (err: any) {
          console.error(chalk.red(`Failed to create tunnel: ${err.message}`));
          process.exit(1);
        }
      }

      if (options.register && host.includes('localhost') && !options.tunnel) {
        console.log(chalk.yellow('Warning: Registering a webhook with localhost. This will only work if the API is also running locally or via a tunnel.'));
      }

      if (secret) {
        console.log(chalk.blue('HMAC signature verification enabled'));
      } else {
        console.log(chalk.yellow('Warning: Running without signature verification. Use --secret for production.'));
      }

      // Security: Limit maximum body size to prevent DOS
      const MAX_BODY_SIZE = 1048576; // 1MB

      // Rate limiting: 100 requests per IP per 60 seconds
      const RATE_LIMIT_WINDOW_MS = 60_000;
      const RATE_LIMIT_MAX = 100;
      const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

      // Periodically clean up rate limit map to prevent memory leak
      setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of rateLimitMap.entries()) {
          if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
            rateLimitMap.delete(ip);
          }
        }
      }, RATE_LIMIT_WINDOW_MS);

      function checkRateLimit(ip: string): boolean {
        const now = Date.now();
        const entry = rateLimitMap.get(ip) ?? { count: 0, windowStart: now };
        if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
          entry.count = 0;
          entry.windowStart = now;
        }
        entry.count++;
        rateLimitMap.set(ip, entry);
        return entry.count <= RATE_LIMIT_MAX;
      }

      function verifySignature(body: string, secretKey: string, header: string | undefined): boolean {
        if (!header) return false;
        const expected = createHmac('sha256', secretKey).update(body).digest('hex');
        const expectedBuf = Buffer.from(`sha256=${expected}`);
        const actualBuf = Buffer.from(header);
        if (expectedBuf.length !== actualBuf.length) return false;
        try {
          return timingSafeEqual(expectedBuf, actualBuf);
        } catch {
          return false;
        }
      }

      const server = http.createServer((req, res) => {
        if (req.method === 'POST') {
          // Check rate limit
          const clientIp = req.socket.remoteAddress ?? '';
          if (!checkRateLimit(clientIp)) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too many requests' }));
            return;
          }

          const chunks: Buffer[] = [];
          let currentSize = 0;

          // Validate Content-Length header if present
          const contentLength = parseInt(req.headers['content-length'] || '0', 10);
          if (contentLength > MAX_BODY_SIZE) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            return;
          }

          req.on('data', (chunk: Buffer) => {
            currentSize += chunk.length;
            if (currentSize > MAX_BODY_SIZE) {
              req.destroy();
              if (!res.headersSent) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload too large' }));
              }
              return;
            }
            chunks.push(chunk);
          });

          req.on('end', () => {
            // Skip if connection was destroyed
            if (!res.headersSent) {
              const bodyBuffer = Buffer.concat(chunks);
              const body = bodyBuffer.toString('utf-8');

              // Verify HMAC signature if secret is configured
              if (secret) {
                const signature = req.headers['x-julius-signature'] as string | undefined;
                if (!verifySignature(body, secret, signature)) {
                  res.writeHead(401, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Invalid signature' }));
                  return;
                }
              }

              try {
                if (body.length === 0) {
                   throw new Error('Empty body');
                }
                const data = JSON.parse(body);
                console.log(chalk.blue(`\n[${new Date().toLocaleTimeString()}] Webhook received:`));

                if (data.session) {
                  output(data.session, 'pretty');
                } else if (data.activity) {
                  output(data.activity, 'pretty');
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

      // Cleanup on exit
      const cleanup = () => {
        if (tunnel) {
          tunnel.close();
        }
        server.close();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      if (options.register) {
        try {
          const client = await getClient();
          const api = new SessionsAPI(client);
          await api.registerWebhook(options.register, { url: host, secret });
          console.log(chalk.green(`Successfully registered webhook for session ${options.register}`));
        } catch (err: any) {
          console.error(chalk.red(`Failed to register webhook: ${err.message}`));
        }
      }
    });
}
