import { type NextRequest, NextResponse } from 'next/server';

// Runtime reverse-proxy for the backend API. Unlike next.config rewrites (which
// are frozen at build time), this reads the backend URL on every request, so the
// same image works in local dev and on split-domain hosts like Render.
export const dynamic = 'force-dynamic';

function backendBase(): string {
  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `${backendBase()}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body, redirect: 'manual' });
  } catch {
    return NextResponse.json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API is unreachable' } }, { status: 502 });
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (['content-encoding', 'transfer-encoding', 'connection', 'content-length', 'set-cookie'].includes(k)) return;
    resHeaders.set(key, value);
  });
  // Preserve Set-Cookie (httpOnly refresh cookie) — getSetCookie keeps them separate.
  const setCookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of setCookies) resHeaders.append('set-cookie', c);

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, { status: upstream.status, headers: resHeaders });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
};
