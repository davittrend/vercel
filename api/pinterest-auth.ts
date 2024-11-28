import type { VercelRequest, VercelResponse } from '@vercel/node';

const clientId = process.env.PINTEREST_CLIENT_ID || '1507772';
const clientSecret = process.env.PINTEREST_CLIENT_SECRET || '12e86e7dd050a39888c5e753908e80fae94f7367';

// Helper function to get the correct callback URL
const getCallbackUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/callback';
  }
  
  // For production, prefer VERCEL_ENV specific URLs
  if (process.env.VERCEL_ENV === 'production') {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  
  // For preview deployments
  if (process.env.VERCEL_ENV === 'preview') {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  
  // Fallback to the deployment URL
  return `https://${process.env.VERCEL_URL}/callback`;
};

const PINTEREST_API_URL = 'https://api-sandbox.pinterest.com/v5';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const redirectUri = getCallbackUrl();

  try {
    switch (path) {
      case 'oauth/url': {
        const scope = 'boards:read,pins:read,pins:write,user_accounts:read,boards:write';
        const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=sandbox`;
        return res.status(200).json({ url: authUrl });
      }

      case 'token': {
        const { code, refresh_token } = req.query;
        
        if (!code && !refresh_token) {
          return res.status(400).json({ error: 'Code or refresh token required' });
        }

        const tokenResponse = await fetch(`${PINTEREST_API_URL}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: refresh_token ? 'refresh_token' : 'authorization_code',
            ...(code ? { code: code as string, redirect_uri: redirectUri } : { refresh_token: refresh_token as string }),
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
        }

        if (code) {
          const userResponse = await fetch(`${PINTEREST_API_URL}/user_account`, {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          });

          const userData = await userResponse.json();
          
          if (!userResponse.ok) {
            throw new Error(userData.message || 'Failed to fetch user data');
          }

          return res.status(200).json({ token: tokenData, user: userData });
        }

        return res.status(200).json({ token: tokenData });
      }

      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Pinterest API Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}