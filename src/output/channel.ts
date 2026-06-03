import { EOL } from 'node:os';
import { stdout, stderr } from 'node:process';

export interface OutputChannel {
  /** Primary output (stdout). For machine-readable data (JSON), piping-friendly. */
  log(message: string): void;
  /** Error output (stderr). Always goes to stderr. */
  error(message: string): void;
  /** Warning output (stderr). Always goes to stderr. */
  warn(message: string): void;
  /** Informational output (stdout). Suppressed in quiet mode.
   * Use for status messages, headers, progress updates. */
  info(message: string): void;
  /** Raw write. For completion scripts, binary data, etc. */
  write(data: Uint8Array | string): void;
  /** Whether the channel is attached to a real terminal (vs pipe/file). */
  isInteractive(): boolean;
}

export class StdioOutputChannel implements OutputChannel {
  log(message: string): void {
    stdout.write(message + EOL);
  }

  error(message: string): void {
    stderr.write(message + EOL);
  }

  warn(message: string): void {
    stderr.write(message + EOL);
  }

  info(message: string): void {
    stdout.write(message + EOL);
  }

  write(data: Uint8Array | string): void {
    stdout.write(data);
  }

  isInteractive(): boolean {
    return stdout.isTTY ?? false;
  }
}

export class NullOutputChannel implements OutputChannel {
  log(message: string): void {
    // Primary data STILL goes through — machine pipelines must work
    stdout.write(message + EOL);
  }

  error(message: string): void {
    stderr.write(message + EOL);
  }

  warn(_: string): void {
    void _;
  }

  info(_: string): void {
    void _;
  }

  write(data: Uint8Array | string): void {
    stdout.write(data);
  }

  isInteractive(): boolean {
    return false;
  }
}
