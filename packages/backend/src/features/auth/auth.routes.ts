import { Router, Request, Response } from 'express';

const router = Router();

// GitHub OAuth response type
interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

// GitHub OAuth token exchange endpoint
// This proxies the token exchange to keep the client_secret secure
router.post('/github/token', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { code, redirect_uri } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('GitHub OAuth credentials not configured');
      return res.status(500).json({ error: 'OAuth not configured' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GitHub token exchange failed:', errorText);
      return res.status(tokenResponse.status).json({ error: 'Failed to exchange code for token' });
    }

    const data = await tokenResponse.json() as GitHubTokenResponse;
    
    if (data.error) {
      console.error('GitHub OAuth error:', data);
      return res.status(400).json({ error: data.error_description || data.error });
    }

    // Return the access token to the client
    return res.json({ access_token: data.access_token });
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
