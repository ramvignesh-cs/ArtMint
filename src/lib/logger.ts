/**
 * Logger utility using Pino
 * Provides structured logging for server-side and client-side code
 */

import pino from "pino";

// Determine if we're in development
const isDevelopment = process.env.NODE_ENV === "development";

// Create logger instance
// Note: pino-pretty uses worker threads which don't work in Next.js SSR
// So we use basic JSON logging instead (still readable in development)
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  base: {
    env: process.env.NODE_ENV,
  },
  // Don't use transport - pino-pretty breaks in Next.js SSR
  // Logs will be JSON format which is still readable
});

// Helper functions for different log levels
export const log = {
  info: (message: string, data?: any) => {
    logger.info(data || {}, message);
  },
  error: (message: string, error?: Error | any, data?: any) => {
    if (error instanceof Error) {
      logger.error(
        {
          ...data,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message
      );
    } else {
      logger.error({ ...data, error }, message);
    }
  },
  warn: (message: string, data?: any) => {
    logger.warn(data || {}, message);
  },
  debug: (message: string, data?: any) => {
    logger.debug(data || {}, message);
  },
};

export default logger;

