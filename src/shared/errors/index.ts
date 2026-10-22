// Error domain & HTTP — controller melempar, middleware menerjemahkan ke
// status + JSON seragam. Stack trace tidak pernah bocor ke klien.

export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 500,
    readonly code: string = "internal_error",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "validation_error");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "not_found");
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(provider: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : undefined;
    super(`Provider "${provider}" tidak dapat dihubungi${detail ? `: ${detail}` : ""}`, 502, "provider_unavailable");
    this.provider = provider;
  }
  readonly provider: string;
}

export class StreamForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, "stream_forbidden");
  }
}
