/**
 * Custom error classes for the Spider-Man Villain Timeline project
 * Provides typed error handling throughout the application
 */

/**
 * Base error class for all application errors
 */
export abstract class ApplicationError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ScrapeError: Errors during web scraping operations
 * Includes network failures, parsing errors, rate limiting
 */
export class ScrapeError extends ApplicationError {
  constructor(
    message: string,
    code: string = 'SCRAPE_ERROR',
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
  }

  static networkFailure(url: string, statusCode?: number): ScrapeError {
    return new ScrapeError(
      `Failed to fetch ${url}${statusCode ? ` (${statusCode})` : ''}`,
      'SCRAPE_NETWORK_ERROR',
      { url, statusCode }
    );
  }

  static parseError(url: string, selector: string): ScrapeError {
    return new ScrapeError(
      `Failed to parse selector "${selector}" from ${url}`,
      'SCRAPE_PARSE_ERROR',
      { url, selector }
    );
  }

  static rateLimitExceeded(url: string, retryAfter?: number): ScrapeError {
    return new ScrapeError(
      `Rate limited: ${url}${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
      'SCRAPE_RATE_LIMIT',
      { url, retryAfter }
    );
  }
}

/**
 * ValidationError: Errors during data validation
 * Schema violations, type mismatches, missing required fields
 */
export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
  }

  static schemaViolation(
    fieldPath: string,
    expectedType: string,
    actualValue: unknown
  ): ValidationError {
    return new ValidationError(
      `Schema violation at "${fieldPath}": expected ${expectedType}, got ${typeof actualValue}`,
      'VALIDATION_SCHEMA_ERROR',
      { fieldPath, expectedType, actualValue }
    );
  }

  static missingRequired(fieldName: string): ValidationError {
    return new ValidationError(
      `Missing required field: ${fieldName}`,
      'VALIDATION_MISSING_FIELD',
      { fieldName }
    );
  }

  static invalidFormat(fieldName: string, format: string): ValidationError {
    return new ValidationError(
      `Invalid format for "${fieldName}": expected ${format}`,
      'VALIDATION_INVALID_FORMAT',
      { fieldName, format }
    );
  }
}

/**
 * IOError: Errors during file I/O operations
 * File not found, permission denied, write failures
 */
export class IOError extends ApplicationError {
  constructor(
    message: string,
    code: string = 'IO_ERROR',
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
  }

  static fileNotFound(filePath: string): IOError {
    return new IOError(
      `File not found: ${filePath}`,
      'IO_FILE_NOT_FOUND',
      { filePath }
    );
  }

  static permissionDenied(filePath: string, operation: string): IOError {
    return new IOError(
      `Permission denied: cannot ${operation} ${filePath}`,
      'IO_PERMISSION_DENIED',
      { filePath, operation }
    );
  }

  static writeFailed(filePath: string, reason: string): IOError {
    return new IOError(
      `Failed to write ${filePath}: ${reason}`,
      'IO_WRITE_FAILED',
      { filePath, reason }
    );
  }

  static readFailed(filePath: string, reason: string): IOError {
    return new IOError(
      `Failed to read ${filePath}: ${reason}`,
      'IO_READ_FAILED',
      { filePath, reason }
    );
  }

  static directoryNotFound(dirPath: string): IOError {
    return new IOError(
      `Directory not found: ${dirPath}`,
      'IO_DIR_NOT_FOUND',
      { dirPath }
    );
  }
}

/**
 * ProcessingError: Errors during data processing/transformation
 * Logic errors, merge conflicts, data inconsistencies
 */
export class ProcessingError extends ApplicationError {
  constructor(
    message: string,
    code: string = 'PROCESSING_ERROR',
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
  }

  static mergeConflict(entityId: string, reason: string): ProcessingError {
    return new ProcessingError(
      `Merge conflict for entity "${entityId}": ${reason}`,
      'PROCESSING_MERGE_CONFLICT',
      { entityId, reason }
    );
  }

  static dataInconsistency(description: string): ProcessingError {
    return new ProcessingError(
      `Data inconsistency detected: ${description}`,
      'PROCESSING_DATA_INCONSISTENCY',
      { description }
    );
  }
}
