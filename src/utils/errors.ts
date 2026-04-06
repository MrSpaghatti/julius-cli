// Error types and exit codes

export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  AUTH_ERROR = 2,
  API_ERROR = 3,
  NOT_FOUND = 4,
  INVALID_ARGS = 5,
  TIMEOUT = 6,
  NETWORK_ERROR = 7,
}

export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: ExitCode = ExitCode.GENERAL_ERROR
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class AuthError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.AUTH_ERROR);
    this.name = 'AuthError';
  }
}

export class APIError extends CLIError {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message, ExitCode.API_ERROR);
    this.name = 'APIError';
  }
}

export class NotFoundError extends CLIError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, ExitCode.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class InvalidArgsError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.INVALID_ARGS);
    this.name = 'InvalidArgsError';
  }
}

export class TimeoutError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.TIMEOUT);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.NETWORK_ERROR);
    this.name = 'NetworkError';
  }
}

export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(ExitCode.GENERAL_ERROR);
  }

  console.error('An unknown error occurred');
  process.exit(ExitCode.GENERAL_ERROR);
}
