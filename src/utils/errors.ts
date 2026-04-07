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
    public exitCode: ExitCode = ExitCode.GENERAL_ERROR,
    public hint?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class AuthError extends CLIError {
  constructor(message: string, hint?: string) {
    super(message, ExitCode.AUTH_ERROR, hint);
    this.name = 'AuthError';
  }
}

export class APIError extends CLIError {
  constructor(
    message: string,
    public statusCode?: number,
    hint?: string
  ) {
    super(message, ExitCode.API_ERROR, hint);
    this.name = 'APIError';
  }
}

export class NotFoundError extends CLIError {
  constructor(resource: string, id: string, hint?: string) {
    super(`${resource} not found: ${id}`, ExitCode.NOT_FOUND, hint);
    this.name = 'NotFoundError';
  }
}

export class InvalidArgsError extends CLIError {
  constructor(message: string, hint?: string) {
    super(message, ExitCode.INVALID_ARGS, hint);
    this.name = 'InvalidArgsError';
  }
}

export class TimeoutError extends CLIError {
  constructor(message: string, hint?: string) {
    super(message, ExitCode.TIMEOUT, hint);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string, hint?: string) {
    super(message, ExitCode.NETWORK_ERROR, hint);
    this.name = 'NetworkError';
  }
}

export function handleError(error: unknown): ExitCode {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    if (error.hint) {
      console.error(`Hint: ${error.hint}`);
    }
    return error.exitCode;
  }

  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    return ExitCode.GENERAL_ERROR;
  }

  console.error('An unknown error occurred');
  return ExitCode.GENERAL_ERROR;
}
