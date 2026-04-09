import { config as dotenvConfig } from 'dotenv';
import { EmailClientConfig } from '@civitas-cerebrum/email-client';

// Load .env variables. If process.env variables already exist (like in CI),
// dotenv will safely ignore them and keep the CI values.
dotenvConfig();

export function validateEmailEnv(): void {
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
      `Create .env file from .env.example and fill in your credentials.`
    );
  }
}

export function loadEmailConfig(): EmailClientConfig {
  validateEmailEnv();

  return {
    smtp: {
      email: process.env.SENDER_EMAIL!,
      password: process.env.SENDER_PASSWORD!,
      host: process.env.SENDER_SMTP_HOST!,
    },
    imap: {
      email: process.env.RECEIVER_EMAIL!,
      password: process.env.RECEIVER_PASSWORD!,
    },
  };
}

export function isEmailConfigured(): boolean {
  try {
    validateEmailEnv();
    return true;
  } catch {
    return false;
  }
}