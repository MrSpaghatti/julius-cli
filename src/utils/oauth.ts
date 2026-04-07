import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { OAuth2Client } from 'google-auth-library';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
  email?: string; // from id_token if present
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Open a URL in the default browser
 */
async function openBrowser(url: string): Promise<void> {
  const start =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(start, [url], { shell: true }).unref();
}

/**
 * Run the browser-based OAuth flow with PKCE
 */
export async function runBrowserOAuthFlow(
  clientId: string,
  clientSecret: string,
  scopes: string[]
): Promise<OAuthTokens> {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    const server = http.createServer();
    
    // Safety: 5 minute timeout
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    const cleanup = () => {
      clearTimeout(timeout);
      process.removeListener('SIGINT', cleanup);
      server.close();
    };

    process.on('SIGINT', cleanup);

    server.on('request', async (req, res) => {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (returnedState !== state) {
          throw new Error('State mismatch');
        }

        if (!code) {
          throw new Error('No code returned');
        }

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Could not determine local server address');
        }
        const redirectUri = `http://127.0.0.1:${address.port}`;
        const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
        
        const { tokens } = await oauth2Client.getToken({
          code,
          codeVerifier: verifier,
        });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful!</h1><p>You can close this window now.</p>');
        cleanup();

        resolve({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiresAt: tokens.expiry_date!,
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication failed</h1><p>${(err as Error).message}</p>`);
        cleanup();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not determine local server address'));
        return;
      }
      const port = address.port;
      const redirectUri = `http://127.0.0.1:${port}`;

      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256' as any,
      });

      console.log('Opening browser for authentication...');
      openBrowser(authorizeUrl);
    });
  });
}

/**
 * Run the device code flow
 */
export async function runDeviceCodeFlow(clientId: string, scopes: string[]): Promise<OAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: scopes.join(' '),
    }),
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Device code request failed: ${JSON.stringify(data)}`);
  }

  const { device_code, user_code, verification_url, interval, expires_in } = data;

  console.log(`\n1. Visit: ${verification_url}`);
  console.log(`2. Enter code: ${user_code}\n`);

  const pollInterval = (interval || 5) * 1000;
  const stopTime = Date.now() + expires_in * 1000;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() > stopTime) {
        reject(new Error('Device code expired'));
        return;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const tokenData = (await tokenResponse.json()) as any;

      if (tokenResponse.ok) {
        resolve({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
        });
      } else if (tokenData.error === 'authorization_pending') {
        setTimeout(poll, pollInterval);
      } else {
        reject(new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`));
      }
    };

    setTimeout(poll, pollInterval);
  });
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: credentials.expiry_date!,
  };
}
