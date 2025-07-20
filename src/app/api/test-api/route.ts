import { NextResponse } from 'next/server';
import { fortyTwoRateLimiter } from '@/lib/rate-limiter';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
  responseTime: number;
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

async function testEndpoint(
  token: string, 
  endpoint: string, 
  method: string = 'GET'
): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    await fortyTwoRateLimiter.waitForRateLimit();
    
    const response = await fetch(`https://api.intra.42.fr${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        endpoint,
        method,
        status: response.status,
        success: false,
        error: `${response.status}: ${response.statusText}`,
        responseTime
      };
    }

    const data = await response.json();
    
    return {
      endpoint,
      method,
      status: response.status,
      success: true,
      data: Array.isArray(data) ? {
        type: 'array',
        length: data.length,
        sample: data.slice(0, 2), // First 2 items for structure
        fields: data.length > 0 ? Object.keys(data[0]) : []
      } : {
        type: 'object',
        fields: Object.keys(data),
        sample: data
      },
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'basic';
    
    const token = await getAccessToken();
    
    const results: APITestResult[] = [];
    
    // Define test endpoints based on the 42 API documentation
    const endpoints = {
      basic: [
        '/v2/campus',
        '/v2/cursus',
        '/v2/users?per_page=5',
        '/v2/languages',
        '/v2/skills',
        '/v2/levels',
        '/v2/achievements',
        '/v2/projects',
      ],
      detailed: [
        // Campus related
        '/v2/campus',
        '/v2/campus/64', // Singapore campus ID
        '/v2/campus/64/users?per_page=3',
        
        // Cursus related
        '/v2/cursus',
        '/v2/cursus/21', // Common cursus ID
        '/v2/cursus/21/users?per_page=3',
        '/v2/cursus/21/projects?per_page=3',
        '/v2/cursus/21/skills?per_page=3',
        
        // Users
        '/v2/users?per_page=5',
        '/v2/users/1', // Test specific user
        
        // Skills and levels
        '/v2/skills?per_page=5',
        '/v2/levels?per_page=5',
        
        // Projects
        '/v2/projects?per_page=5',
        '/v2/projects/1', // Test specific project
        
        // Languages
        '/v2/languages',
        
        // Achievements
        '/v2/achievements?per_page=5',
        
        // Groups (if accessible)
        '/v2/groups?per_page=5',
        
        // Coalitions
        '/v2/coalitions?per_page=5',
        
        // Notions (if accessible)
        '/v2/notions?per_page=5',
      ],
      comprehensive: [
        // Core Endpoints
        '/v2/campus',
        '/v2/campus?per_page=100',
        '/v2/cursus',
        '/v2/cursus?per_page=100', 
        '/v2/languages',
        '/v2/skills',
        '/v2/skills?per_page=100',
        '/v2/achievements',
        '/v2/achievements?per_page=100',
        '/v2/projects',
        '/v2/projects?per_page=100',
        
        // Campus Deep Dive
        '/v2/campus/1', // Paris
        '/v2/campus/64', // Singapore
        '/v2/campus/35', // Amman
        '/v2/campus/75', // Rabat
        '/v2/campus/1/users?per_page=5',
        '/v2/campus/64/users?per_page=10',
        
        // Cursus Deep Dive  
        '/v2/cursus/21', // 42cursus
        '/v2/cursus/1', // Legacy 42
        '/v2/cursus/21/projects?per_page=20',
        '/v2/cursus/21/skills?per_page=20',
        '/v2/cursus/21/levels?per_page=20',
        
        // User Variations
        '/v2/users?per_page=10',
        '/v2/users?per_page=10&page=2',
        '/v2/users?per_page=10&page=100', // Test high page numbers
        
        // Project Deep Dive
        '/v2/projects/1', // Libft
        '/v2/projects/2', // 
        '/v2/projects/42', // Test specific projects
        '/v2/projects/100',
        '/v2/projects/1000',
        
        // Achievement Exploration
        '/v2/achievements/1',
        '/v2/achievements/4',
        '/v2/achievements/10',
        
        // Skill Exploration
        '/v2/skills/1',
        '/v2/skills/14',
        
        // Language Deep Dive
        '/v2/languages/1', // French
        '/v2/languages/2', // English
        
        // Experimental Endpoints
        '/v2/apps',
        '/v2/me',
        '/v2/teams?per_page=5',
        '/v2/evaluations?per_page=5',
        '/v2/attachments?per_page=5',
        '/v2/events?per_page=5',
        '/v2/locations?per_page=5',
        '/v2/messages?per_page=5',
        '/v2/partnerships?per_page=5',
        '/v2/qualifications?per_page=5',
        '/v2/slots?per_page=5',
        '/v2/topics?per_page=5',
        '/v2/titles?per_page=5',
        '/v2/expertises?per_page=5',
        '/v2/flash?per_page=5',
        '/v2/exams?per_page=5',
        '/v2/scales?per_page=5',
        '/v2/scale_teams?per_page=5',
        '/v2/corrections?per_page=5',
        '/v2/correction_points?per_page=5',
        '/v2/patron_messages?per_page=5',
        '/v2/patron_rewards?per_page=5',
        '/v2/product_actions?per_page=5',
        '/v2/user_actions?per_page=5',
        '/v2/quest_stations?per_page=5',
        '/v2/quests?per_page=5',
        '/v2/roles?per_page=5',
        '/v2/subnotions?per_page=5',
        '/v2/tags?per_page=5',
        '/v2/votes?per_page=5',
        '/v2/webhooks?per_page=5',
      ]
    };

    const testEndpoints = endpoints[testType as keyof typeof endpoints] || endpoints.basic;
    
    // Test endpoints sequentially with proper rate limiting
    for (const endpoint of testEndpoints) {
      const result = await testEndpoint(token, endpoint);
      results.push(result);
    }
    
    // Summary statistics
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
      testType
    };

    return NextResponse.json({
      summary,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Testing Error:', error);
    return NextResponse.json(
      { error: 'Failed to test API endpoints' },
      { status: 500 }
    );
  }
}