const TRANSIENT_PRISMA_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Timeout reaching database
  "P1008", // Operations timed out
  "P1017", // Server closed connection
  "P2024", // Connection pool timeout
]);

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
}

function isLikelyTransientConnectionError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code && TRANSIENT_PRISMA_ERROR_CODES.has(code)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  // Match OS-level and application-level timeout errors
  return /ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED|connection|closed|timeout|terminated|pool|timed out/i.test(
    message,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Prisma operation timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

// Exponential backoff delays: 300ms, 700ms, 1500ms
const BACKOFF_DELAYS = [300, 700, 1500];
const DEFAULT_OPERATION_TIMEOUT_MS = 30000; // Increased from 12s to 30s

export async function withPrismaRetry<T>(
  operation: () => PromiseLike<T>,
  maxRetries = 3,
  operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await withTimeout(operation(), operationTimeoutMs);
    } catch (error) {
      const isTransientError = isLikelyTransientConnectionError(error);
      const shouldRetry = attempt < maxRetries && isTransientError;

      if (!shouldRetry) {
        throw error;
      }

      const backoffMs = BACKOFF_DELAYS[attempt] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
      console.warn(
        `[Prisma Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${backoffMs}ms...`,
        {
          error: error instanceof Error ? error.message : String(error),
          code: getErrorCode(error),
          timeoutMs: operationTimeoutMs,
        },
      );

      await sleep(backoffMs);
      attempt += 1;
    }
  }
}

export function formatPrismaError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
