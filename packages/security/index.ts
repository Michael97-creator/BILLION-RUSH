export type RequestContext = {
  userId: string;
  sessionId?: string;
  requestId: string;
  idempotencyKey?: string;
};

export function requireIdempotencyKey(value: string | null | undefined): string {
  if (!value || value.length < 16 || value.length > 128) {
    throw new Error("A valid idempotency key is required.");
  }
  return value;
}

export function isExpired(deadline: string, now = Date.now()): boolean {
  return new Date(deadline).getTime() <= now;
}
