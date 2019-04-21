export interface User {
  id: string;
  slackWebhookUrl: string;
  msn: string; // Softbank refers to phone numbers as "msn"
  password: string;
}

export interface Credential {
  msn: string;
  password: string;
}

// In GB
export interface DataUsageInfo {
  total: number; // Current + remaining usage
  current: number;
}