/**
 * Logs a server-side failure with its cause, for the hosting platform's logs. The one place the
 * app writes to the console; never used for personal data (arc42 §8.3).
 */
export function logError(message: string, error: unknown): void {
  // eslint-disable-next-line no-console -- server logs on Vercel are read from stderr
  console.error(message, error)
}
