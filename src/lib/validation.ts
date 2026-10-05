// Shared form validation for registration and password reset.
// Each validator returns an error message, or null when the value is valid.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_REQUIREMENTS = 'At least 8 characters, with at least one letter and one number.';

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Please enter your email address.';
  if (!EMAIL_PATTERN.test(value)) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}
