import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase';
import { runMiddleware, corsAllMethods } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';

export async function GET(req: NextRequest) {
  const { user, token } = await validateUserAndToken(req.headers.get('authorization'));
  if (!user || !token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
  }

  const supabase = createSupabaseClient(token);
  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get('since');
  const bookHash = searchParams.get('book_hash');

  let query = supabase.from('replacements').select('*').eq('user_id', user.id);

  if (bookHash) query = query.eq('book_hash', bookHash);

  if (sinceParam) {
    const since = new Date(Number(sinceParam));
    if (isNaN(since.getTime())) {
      return NextResponse.json({ error: 'Invalid "since" timestamp' }, { status: 400 });
    }
    const sinceIso = since.toISOString();
    query = query.or(`updated_at.gt.${sinceIso},deleted_at.gt.${sinceIso}`);
  }

  query = query.order('updated_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch replacements:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }

  const response = NextResponse.json(data || [], { status: 200 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export async function POST(req: NextRequest) {
  const { user, token } = await validateUserAndToken(req.headers.get('authorization'));
  if (!user || !token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
  }
  const supabase = createSupabaseClient(token);
  const body = await req.json();
  const { book_hash, cfi = null, original, replacement, scope = 'single', device_id } = body;
  if (!book_hash || !original || !replacement) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const insertRow = {
    user_id: user.id,
    book_hash,
    cfi,
    original,
    replacement,
    scope,
    device_id,
    updated_at: new Date().toISOString(),
  } as any;

  const { data, error } = await supabase.from('replacements').insert(insertRow).select();
  if (error) {
    console.error('Failed to create replacement:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
  return NextResponse.json(data?.[0] || null, { status: 201 });
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.url) {
    return res.status(400).json({ error: 'Invalid request URL' });
  }

  const protocol = process.env['PROTOCOL'] || 'http';
  const host = process.env['HOST'] || 'localhost:3000';
  const url = new URL(req.url, `${protocol}://${host}`);

  await runMiddleware(req, res, corsAllMethods);

  try {
    let response: Response;
    if (req.method === 'GET') {
      const nextReq = new NextRequest(url.toString(), {
        headers: new Headers(req.headers as Record<string, string>),
        method: 'GET',
      });
      response = await GET(nextReq);
    } else if (req.method === 'POST') {
      const nextReq = new NextRequest(url.toString(), {
        headers: new Headers(req.headers as Record<string, string>),
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      response = await POST(nextReq);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default handler;
