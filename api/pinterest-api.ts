import type { VercelRequest, VercelResponse } from '@vercel/node';

const PINTEREST_API_URL = 'https://api-sandbox.pinterest.com/v5';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    let body = req.body;
    if (body && path === 'pins') {
      const data = JSON.parse(body);
      if (data.media_source?.url?.startsWith('data:')) {
        data.media_source.url = 'https://picsum.photos/800/600';
        body = JSON.stringify(data);
      }
    }

    const response = await fetch(`${PINTEREST_API_URL}${path}`, {
      method: req.method,
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      ...(body && { body })
    });

    const data = await response.json();

    if (response.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Pinterest API Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}