/** Keep TLS certificate verification explicit for Neon URLs across pg versions.
 * @param {string} value
 */
export function postgresUrl(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid PostgreSQL URL.');
  if (url.searchParams.get('sslmode') === 'require') url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
