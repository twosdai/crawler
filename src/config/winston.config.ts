import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const createLoggerConfig = (logLevel: string) => {
  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, context, trace, ms }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''} ${ms}`;
          }),
        ),
      }),
    ],
    level: logLevel,
  });
};