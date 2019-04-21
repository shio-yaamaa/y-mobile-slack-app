import * as AWS from 'aws-sdk';

import { User } from '../types';

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
          return {
            id: item.sk,
            slackWebhookUrl: item.slackWebhookUrl,
            msn: item.msn,
            password: item.password,
          };
        });
        resolve(users);
      });
    });
  }
}

export default new DB();