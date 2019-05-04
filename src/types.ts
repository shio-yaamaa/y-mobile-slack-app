import JSTDateTime from './lib/JSTDateTime';

export interface User {
  id: string;
  slackWebhookUrl: string;
  yMobileCredential: YMobileCredential;
}

export interface YMobileCredential {
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