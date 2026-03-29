const isValid = (str: string): boolean => /^[a-z0-9]{48}$/i.test(str);

export default async (event: Request) => {
  if (event.method !== 'PUT') {
    return new Response('Method not allowed', { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let params: { authKey: string } | null = null
  try {
    const eventBodyString = await event.text()
    params = JSON.parse(eventBodyString)
  } catch (e) {
    return new Response('Invalid request body', { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!params || !params.authKey || !isValid(params.authKey)) {
    return new Response('Invalid request body', { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const maxAge = 400 * 24 * 60 * 60;
  const serializedCookie = `__Secure-authKey=${encodeURIComponent(params.authKey)}; Max-Age=${maxAge}; Domain=diy-llm-bot.com; Path=/; HttpOnly; Secure; SameSite=Strict`;

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': serializedCookie,
      'Content-Type': 'application/json',
    }
  });
};