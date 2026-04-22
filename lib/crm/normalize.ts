export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digitsOnly = input.replace(/[^0-9]/g, "");
  if (digitsOnly.length === 0) return null;
  return input.replace(/[^0-9+]/g, "");
}

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}
