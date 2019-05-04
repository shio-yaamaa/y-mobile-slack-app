import * as AWS from 'aws-sdk';

import { User, DataUsageRecord } from '../types';

interface DBUser {
  pk: 'user';
  sk: string; // User ID
  slackWebhookUrl: string;
  ymobileCredential: {
    msn: string;
    password: string;
  };
}

// interface DBMonthlyRecords {
//   pk: string;
//   sk: string; // Corresponds to the user's SK
//   records: DBRecord[];
// }

interface DBRecord {
  hour: {
    date: number;
    hour: number;
  };
  dataUsageAmounts: {
    total: number;
    current: number;
  };
}

class DB {
  private documentClient: AWS.DynamoDB.DocumentClient;

  constructor() {
    this.documentClient = new AWS.DynamoDB.DocumentClient({
      region: process.env.DYNAMODB_REGION,
    });
  }

  public async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const params: AWS.DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        KeyConditionExpression: '#p = :user',
        ExpressionAttributeNames: {
          '#p': 'pk',
        },
        ExpressionAttributeValues: {
          ':user': 'user',
        },
      };
      this.documentClient.query(params, (error, data) => {
        if (error) reject(error);
        const users: User[] = data.Items.map(item => {
          const user = item as DBUser;
          return {
            id: user.sk,
            slackWebhookUrl: user.slackWebhookUrl,
            ymobileCredential: user.ymobileCredential,
          };
        });
        resolve(users);
      });
    });
  }

  public async addDataUsageRecord(user: User, record: DataUsageRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRecord: DBRecord = {
        hour: {
          date: record.datetime.date,
          hour: record.datetime.hour,
        },
        dataUsageAmounts: record.dataUsageAmounts,
      };
      const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: {
          pk: record.datetime.toPk(),
          sk: user.id,
        },
        UpdateExpression: 'SET #r = list_append(if_not_exists(#r, :e), :r)',
        ExpressionAttributeNames: {
          '#r': 'records'
        },
        ExpressionAttributeValues: {
          ':e': [],
          ':r': [dbRecord],
        },
      };
      this.documentClient.update(params, (error, _data) => {
        if (error) reject(error);
        resolve();
      });
    });
  }
}

export default new DB();