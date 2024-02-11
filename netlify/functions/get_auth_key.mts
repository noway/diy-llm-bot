import type { Context } from "@netlify/functions"

export default async (event: Request, context: Context) => {
  if (event.method !== 'PUT') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authKey = context.cookies.get('__Host-authKey');
  return new Response(JSON.stringify({ authKey }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
};