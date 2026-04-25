export function isPostgresError(error: unknown): error is { code: string; detail: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
