export class ServiceError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function reject(status: number, code: string, message: string): never { throw new ServiceError(status, code, message); }
export function apostrophes(value: string) { return value.replace(/[‘’ʻʼʹ＇`´]/gu, "'"); }
export function normalizeName(value: string) { return apostrophes(value.normalize('NFKC')).trim().replace(/\s+/gu, ' ').toLocaleLowerCase('uz-Latn'); }
export function displayName(value: unknown) {
  if (typeof value !== 'string') return reject(400, 'INVALID_NAME', 'Ismingizni kiriting.');
  const clean = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!clean || clean.length > 120 || /[\p{Cc}\p{Cf}]/u.test(clean)) return reject(400, 'INVALID_NAME', 'Ism 1–120 ta belgidan iborat bo‘lsin.');
  return clean;
}
export function uuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return reject(400, 'INVALID_ID', 'So‘rov ma’lumotlari noto‘g‘ri.');
  return value;
}
export function responseText(value: unknown) {
  if (typeof value !== 'string' || value.length > 10_000 || value.includes('\u0000')) return reject(400, 'INVALID_RESPONSE', 'Javob 10 000 ta belgidan oshmasin.');
  return value;
}
