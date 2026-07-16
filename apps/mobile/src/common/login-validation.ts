import {
  validateEmail,
  validatePassword,
  type ValidationResult,
} from "./function";

export function validateLoginCredentials({
  email,
  password,
}: {
  email: string;
  password: string;
}): ValidationResult {
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) return emailResult;

  const passwordResult = validatePassword(password);
  if (!passwordResult.isValid) return passwordResult;

  return { isValid: true };
}
