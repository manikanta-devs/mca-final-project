/**
 * API Error handling utilities
 */

export class APIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }

  static isNetworkError(error) {
    return !error.status || error.status === 0;
  }

  static isValidationError(error) {
    return error.status === 422 || error.status === 400;
  }

  static isAuthError(error) {
    return error.status === 401 || error.status === 403;
  }

  static isServerError(error) {
    return error.status >= 500;
  }

  getReadableMessage() {
    switch (this.status) {
      case 0:
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      case 400:
        return this.data.message || 'Bad request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in.';
      case 403:
        return 'Forbidden. You do not have access to this resource.';
      case 404:
        return 'Resource not found.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return this.message || 'An error occurred';
    }
  }

  getRetryable() {
    return (
      this.status === 429 ||
      this.status === 500 ||
      this.status === 503 ||
      this.status === 0 ||
      !this.status
    );
  }
}

/**
 * Parse API error response
 */
export function parseApiError(error) {
  // Network error
  if (!error.response) {
    return new APIError(
      'Network request failed',
      0,
      { details: error.message }
    );
  }

  const { status, data } = error.response;
  const message = data?.error || data?.message || 'Unknown error';

  return new APIError(message, status, data);
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  maxRetries = 3,
  baseDelayMs = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const apiError = parseApiError(error);

      if (!apiError.getRetryable() || i === maxRetries - 1) {
        throw apiError;
      }

      const delayMs = baseDelayMs * Math.pow(2, i);
      console.warn(
        `Attempt ${i + 1} failed. Retrying in ${delayMs}ms...`,
        apiError
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Format API error for display
 */
export function formatApiError(error) {
  if (error instanceof APIError) {
    return {
      title: 'Error',
      message: error.getReadableMessage(),
      retryable: error.getRetryable(),
      details: error.data
    };
  }

  return {
    title: 'Error',
    message: error.message || 'An error occurred',
    retryable: false,
    details: {}
  };
}

/**
 * Validate error response from API
 */
export function isValidErrorResponse(data) {
  return (
    data &&
    typeof data === 'object' &&
    ('error' in data || 'message' in data)
  );
}

/**
 * Extract error messages from validation errors
 */
export function extractValidationErrors(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const errors = {};

  // Handle different error response formats
  if (data.details && typeof data.details === 'object') {
    Object.assign(errors, data.details);
  }

  if (data.errors && Array.isArray(data.errors)) {
    data.errors.forEach(err => {
      if (err.field) {
        errors[err.field] = err.message;
      }
    });
  }

  // Handle Pydantic-style errors
  if (Array.isArray(data)) {
    data.forEach(err => {
      if (err.loc && err.loc.length > 0) {
        const field = err.loc[0];
        errors[field] = err.msg;
      }
    });
  }

  return errors;
}
