import JSTDateTime from './lib/JSTDateTime';

export interface User {
  id: string;
  slackWebhookUrl: string;
  ymobileCredential: YmobileCredential;
}

export interface YmobileCredential {
  msn: string; // Softbank refers to phone numbers as "msn"
  password: string;
}

export interface DataUsageRecord {
  datetime: JSTDateTime;
  dataUsageAmounts: DataUsageAmounts;
}

// In GB
export interface DataUsageAmounts {
  total: number; // Current + remaining usage
  current: number;
}