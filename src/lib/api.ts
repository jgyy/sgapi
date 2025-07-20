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

interface CursusUser {
  id: number;
  begin_at: string;
  end_at: string | null;
  grade: string | null;
  level: number;
  skills: unknown[];
  blackholed_at: string | null;
  has_coalition: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    login: string;
    url: string;
  };
  cursus: {
    id: number;
    created_at: string;
    name: string;
    slug: string;
    kind: string;
  };
}

interface Student {
  id: number;
  email: string;
  login: string;
  first_name: string;
  last_name: string;
  usual_full_name?: string;
  usual_first_name: string | null;
  url: string;
  phone: string;
  displayname: string;
  kind: string; // "external", "student", etc.
  image: {
    link: string | null;
    versions: {
      large: string | null;
      medium: string | null;
      small: string | null;
      micro: string | null;
    };
  };
  'staff?': boolean;
  correction_point: number;
  pool_month: string | null; // e.g., "july"
  pool_year: string | null;  // e.g., "2025"
  location: string | null;   // Current location in campus
  wallet: number;            // 42 wallet points
  anonymize_date: string;    // GDPR compliance
  alumnized_at: string | null;
  data_erasure_date: string | null;
  created_at: string;
  updated_at: string;
  'alumni?': boolean;
  'active?': boolean;
  cursus_users?: CursusUser[]; // Not included by default per API docs
}

class FortyTwoAPI {
  private baseURL = 'https://api.intra.42.fr';
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_MS = 500;

  constructor() {
    this.clientId = process.env.UID || '';
    this.clientSecret = process.env.SECRET || '';
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    await this.waitForRateLimit();

    const response = await fetch(`${this.baseURL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data: TokenResponse = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  async getStudents(page: number = 1, perPage: number = 100): Promise<Student[]> {
    const token = await this.getAccessToken();
    
    await this.waitForRateLimit();
    
    const response = await fetch(
      `${this.baseURL}/v2/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch students: ${response.status}`);
    }

    return response.json();
  }
}

export { FortyTwoAPI, type Student, type Campus, type CursusUser };