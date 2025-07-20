import { NextResponse } from 'next/server';
import { fortyTwoRateLimiter } from '@/lib/rate-limiter';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '50'), 100).toString(); // Limit to API max
    const campusId = searchParams.get('campus_id');

    const token = await getAccessToken();
    
    let url: string;
    const baseParams = `page=${page}&per_page=${perPage}`;
    
    if (campusId) {
      // Fetch users from specific campus
      url = `https://api.intra.42.fr/v2/campus/${campusId}/users?${baseParams}`;
    } else {
      // Fetch all users
      url = `https://api.intra.42.fr/v2/users?${baseParams}`;
    }
    
    await fortyTwoRateLimiter.waitForRateLimit();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Enhanced error handling based on API documentation
      switch (response.status) {
        case 429:
          console.warn('Rate limited by 42 API - implementing backoff');
          return NextResponse.json([], { 
            status: 200,
            headers: { 
              'X-Rate-Limited': 'true',
              'X-Error-Message': 'Rate limited - please try again later'
            }
          });
        
        case 403:
          console.error('Forbidden access to 42 API endpoint');
          return NextResponse.json([], { 
            status: 200,
            headers: { 
              'X-Forbidden': 'true',
              'X-Error-Message': 'Access forbidden - endpoint may require special permissions'
            }
          });
        
        case 404:
          console.error('404 - Campus or endpoint not found');
          return NextResponse.json([], { 
            status: 200,
            headers: { 
              'X-Not-Found': 'true',
              'X-Error-Message': 'Resource not found'
            }
          });
        
        default:
          console.error(`42 API error: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch students: ${response.status}`);
      }
    }

    const students = await response.json();
    
    // Add response metadata for frontend
    const responseHeaders = {
      'X-Total-Count': students.length.toString(),
      'X-Page': page,
      'X-Per-Page': perPage,
    };
    
    return NextResponse.json(students, { 
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}