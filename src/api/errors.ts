/**
 * Error handling for VenalabsApiClient
 */

/**
 * Error codes returned by the Venalabs API
 */
export const VenalabsErrorCodes = {
  /** API key is invalid or missing */
  INVALID_API_KEY: 'INVALID_API_KEY',
  /** User token is invalid or missing */
  INVALID_TOKEN: 'INVALID_TOKEN',
  /** User token has expired */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  /** Requested resource was not found */
  NOT_FOUND: 'NOT_FOUND',
  /** Network error occurred during request */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Request was rate limited */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Request timed out */
  TIMEOUT: 'TIMEOUT',
  /** Server returned an error */
  SERVER_ERROR: 'SERVER_ERROR',
  /** Unknown error occurred */
  UNKNOWN: 'UNKNOWN',
} as const;

export type VenalabsErrorCode = (typeof VenalabsErrorCodes)[keyof typeof VenalabsErrorCodes];

/**
 * Custom error class for Venalabs API errors
 */
export class VenalabsApiError extends Error {
  /**
   * Create a new VenalabsApiError
   * @param code - Error code from VenalabsErrorCodes
   * @param status - HTTP status code (0 for network errors)
   * @param message - Human-readable error message
   */
  constructor(
    public readonly code: VenalabsErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'VenalabsApiError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    const ErrorWithCaptureStackTrace = Error as typeof Error & {
      captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
    };
    if (typeof ErrorWithCaptureStackTrace.captureStackTrace === 'function') {
      ErrorWithCaptureStackTrace.captureStackTrace(this, VenalabsApiError);
    }
  }

  /**
   * Check if this error is due to authentication issues
   */
  isAuthError(): boolean {
    return (
      this.code === VenalabsErrorCodes.INVALID_API_KEY ||
      this.code === VenalabsErrorCodes.INVALID_TOKEN ||
      this.code === VenalabsErrorCodes.TOKEN_EXPIRED
    );
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return (
      this.code === VenalabsErrorCodes.NETWORK_ERROR ||
      this.code === VenalabsErrorCodes.TIMEOUT ||
      this.code === VenalabsErrorCodes.SERVER_ERROR ||
      this.code === VenalabsErrorCodes.RATE_LIMITED
    );
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(status: number, body?: { code?: number; type?: string; message?: string }): VenalabsApiError {
    // Map status codes to error codes
    let code: VenalabsErrorCode;
    let message: string;

    switch (status) {
      case 401:
        code = body?.type === 'TOKEN_EXPIRED'
          ? VenalabsErrorCodes.TOKEN_EXPIRED
          : VenalabsErrorCodes.INVALID_TOKEN;
        message = body?.message || 'Authentication failed';
        break;
      case 403:
        code = VenalabsErrorCodes.INVALID_API_KEY;
        message = body?.message || 'Invalid API key';
        break;
      case 404:
        code = VenalabsErrorCodes.NOT_FOUND;
        message = body?.message || 'Resource not found';
        break;
      case 429:
        code = VenalabsErrorCodes.RATE_LIMITED;
        message = body?.message || 'Too many requests';
        break;
      default:
        if (status >= 500) {
          code = VenalabsErrorCodes.SERVER_ERROR;
          message = body?.message || 'Server error';
        } else {
          code = VenalabsErrorCodes.UNKNOWN;
          message = body?.message || `Request failed with status ${status}`;
        }
    }

    return new VenalabsApiError(code, status, message);
  }

  /**
   * Create error from network failure
   */
  static fromNetworkError(error: Error): VenalabsApiError {
    return new VenalabsApiError(
      VenalabsErrorCodes.NETWORK_ERROR,
      0,
      `Network error: ${error.message}`
    );
  }

  /**
   * Create error from timeout
   */
  static fromTimeout(timeoutMs: number): VenalabsApiError {
    return new VenalabsApiError(
      VenalabsErrorCodes.TIMEOUT,
      0,
      `Request timed out after ${timeoutMs}ms`
    );
  }
}
