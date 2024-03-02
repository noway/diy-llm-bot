import { serialize } from 'cookie'

const isValid = (str: string): boolean => /^[a-z0-9]{48}$/i.test(str);

export default async (event: Request) => {
  if (event.method !== 'PUT') {
    return new Response('Method not allowed', { status: 405 });
  }

  let params: { authKey: string } | null = null
  try {
    const eventBodyString = await event.text()
    params = JSON.parse(eventBodyString)
  } catch (e) {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!params || !params.authKey || !isValid(params.authKey)) {
    return new Response('Invalid request body', { status: 400 });
  }

  const serializedCookie = serialize('__Secure-authKey', params.authKey, {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    domain: '.diy-llm-bot.com',
    path: '/',
    maxAge: 400 * 24 * 60 * 60,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': serializedCookie,
      'Content-Type': 'application/json',
    }
  });
};