import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase';
import { runMiddleware, corsAllMethods } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';

export async function PATCH(req: NextRequest) {
  const { user, token } = await validateUserAndToken(req.headers.get('authorization'));
  if (!user || !token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
  }
  const supabase = createSupabaseClient(token);
  const body = await req.json();
  const parts = req.url?.split('/') || [];
  const id = parts[parts.length - 1];
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updateRow = { ...body, updated_at: new Date().toISOString() } as any;
  const { data, error } = await supabase
    .from('replacements')
    .update(updateRow)
    .match({ id, user_id: user.id })
    .select();
  if (error) {
    console.error('Failed to update replacement:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
  return NextResponse.json(data?.[0] || null, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { user, token } = await validateUserAndToken(req.headers.get('authorization'));
  if (!user || !token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
  }
  const supabase = createSupabaseClient(token);
  const parts = req.url?.split('/') || [];
  const id = parts[parts.length - 1];
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updateRow = { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('replacements')
    .update(updateRow)
    .match({ id, user_id: user.id })
    .select();
  if (error) {
    console.error('Failed to delete replacement:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
  return NextResponse.json(data?.[0] || null, { status: 200 });
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
    if (req.method === 'PATCH') {
      const nextReq = new NextRequest(url.toString(), {
        headers: new Headers(req.headers as Record<string, string>),
        method: 'PATCH',
        body: JSON.stringify(req.body),
      });
      response = await PATCH(nextReq);
    } else if (req.method === 'DELETE') {
      const nextReq = new NextRequest(url.toString(), {
        headers: new Headers(req.headers as Record<string, string>),
        method: 'DELETE',
      });
      response = await DELETE(nextReq);
    } else {
      res.setHeader('Allow', ['PATCH', 'DELETE']);
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
