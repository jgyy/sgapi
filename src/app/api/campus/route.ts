import { NextResponse } from 'next/server';
import { fortyTwoRateLimiter } from '@/lib/rate-limiter';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface Campus {
  id: number;
  name: string;
  time_zone: string;
  language: {
    id: number;
    name: string;
    identifier: string;
    created_at: string;
    updated_at: string;
  };
  users_count: number;
  vogsphere_id: number;
  country: string;
  address: string;
  zip: string;
  city: string;
  website: string;
  facebook: string;
  twitter: string;
  active: boolean;
  public: boolean;
  email_extension: string;
  default_hidden_phone: boolean;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.UID;
  const clientSecret = process.env.SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing API credentials');
  }

  await fortyTwoRateLimiter.waitForRateLimit();

  const response = await fetch('https://api.intra.42.fr/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

export async function GET() {
  try {
    const token = await getAccessToken();
    
    await fortyTwoRateLimiter.waitForRateLimit();
    
    const response = await fetch(
      'https://api.intra.42.fr/v2/campus',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch campuses: ${response.status}`);
    }

    const campuses: Campus[] = await response.json();
    
    // Filter only active and public campuses, sort by name
    const activeCampuses = campuses
      .filter(campus => campus.active && campus.public)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json(activeCampuses);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campuses' },
      { status: 500 }
    );
  }
}