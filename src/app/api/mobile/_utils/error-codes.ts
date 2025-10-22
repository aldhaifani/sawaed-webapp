export const ERROR_CODES = {
  invalidCredentials: "invalid_credentials",
  unverified: "unverified",
  emailAlreadyExists: "email_already_exists",
  userExists: "user_exists",
  userUnverified: "user_unverified",
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
