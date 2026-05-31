// src/utils/logger.js
// Winston structured logger
// - Development: colorized + readable console output
// - Production : JSON (parseable by log aggregation tools: Loki, ELK)

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV !== 'production';

// Human-readable format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta)}` : '';
    return `[${ts}] ${level}: ${stack || message}${metaStr}`;
  })
);

// Structured JSON for production
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Daily rotating file transport — auto-delete after 14 days
const fileTransport = new DailyRotateFile({
  filename: path.join('logs', '%DATE%-combined.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join('logs', '%DATE%-error.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '30d',
  level: 'error',
});

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'edumarket-api' },
  transports: [
    new transports.Console(),
    fileTransport,
    errorFileTransport,
  ],
  // Do NOT crash on uncaught exceptions here — handled in server.js
  exitOnError: false,
});

module.exports = logger;
