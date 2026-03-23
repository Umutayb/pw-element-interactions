/**
 * Environment variables for email configuration.
 * Priority: process.env > .env file (local development)
 * DO NOT commit .env files to version control.
 * Use .env.example as a template.
 */

import { config as dotenvConfig } from 'dotenv';

// Load from .env file only if process.env doesn't already have values
// This allows CI to use GitHub Secrets via process.env, while locals use .env file
const alreadyConfigured = [
  'SENDER_EMAIL',
  'SENDER_PASSWORD',
  'RECEIVER_EMAIL',
  'RECEIVER_PASSWORD',
].every((key) => process.env[key]);

if (!alreadyConfigured) {
  dotenvConfig();
}

export interface EmailEnvConfig {
  senderEmail: string;
  senderPassword: string;
  senderSmtpHost: string;
  receiverEmail: string;
  receiverPassword: string;
}

/**
 * Validates that required environment variables are set.
 * Throws an error if any required variable is missing.
 */
function validateEmailEnv(): void {
  const required = [
    'SENDER_EMAIL',
    'SENDER_PASSWORD',
    'SENDER_SMTP_HOST',
    'RECEIVER_EMAIL',
    'RECEIVER_PASSWORD',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required email env variables: ${missing.join(', ')}\n` +
        `Create .env.local file from .env.example and fill in your credentials.`
    );
  }
}

/**
 * Loads email configuration from environment variables.
 * @returns EmailEnvConfig with all required credentials
 * @throws Error if required environment variables are missing
 */
export function loadEmailConfig(): EmailEnvConfig {
  validateEmailEnv();

  return {
    senderEmail: process.env.SENDER_EMAIL!,
    senderPassword: process.env.SENDER_PASSWORD!,
    senderSmtpHost: process.env.SENDER_SMTP_HOST!,
    receiverEmail: process.env.RECEIVER_EMAIL!,
    receiverPassword: process.env.RECEIVER_PASSWORD!,
  };
}

/**
 * Returns true if all required email environment variables are set.
 * Used to conditionally enable email features.
 */
export function isEmailConfigured(): boolean {
  try {
    validateEmailEnv();
    return true;
  } catch {
    return false;
  }
}
