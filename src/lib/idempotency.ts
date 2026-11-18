// Every action that moves money or changes a setting sends an
// Idempotency-Key, so pressing the button twice, or a retry after a dropped
// connection, does the action only once. One key per attempt: the same key
// is reused if the same attempt is sent again.
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

// The server accepts 16 to 128 letters, numbers, - or _.
export function isValidIdempotencyKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(key);
}
