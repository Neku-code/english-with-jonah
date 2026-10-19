export function GET() {
  return Response.json(
    { status: 'ok', application: 'English with Jonah', release: '0.1.0' },
    { headers: { 'cache-control': 'no-store' } }
  );
}
