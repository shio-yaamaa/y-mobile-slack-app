import * as AWS from 'aws-sdk';

import { User, DataUsageRecord } from '../types';

import JSTDateTime from '../lib/JSTDateTime';

interface DBUser {
  pk: 'user';
  sk: string; // User ID
  slackWebhookUrl: string;
  ymobileCredential: {
    msn: string;
    password: string;
  };
}

interface DBMonthlyRecord {
  pk: string;
  sk: string; // Corresponds to the user's SK
  records: DBRecord[];
}

interface DBRecord {
  hour: {
    date: number;
    hour: number;
  };
  dataUsageAmounts: {
    capacity: number;
    current: number;
  };
}

const JSTDateTimeToPk = (datetime: JSTDateTime): string => {
  const paddedMonthString = `0${datetime.month}`.slice(-2);
  return `month-${datetime.year}${paddedMonthString}`;
};

const DataUsageRecordToDBRecord = (record: DataUsageRecord): DBRecord => {
  return {
    hour: {
      date: record.datetime.date,
      hour: record.datetime.hour,
    },
    dataUsageAmounts: record.dataUsageAmounts,
  };
};

const DBRecordToDataUsageRecord = (yearMonth: JSTDateTime, record: DBRecord): DataUsageRecord => {
  return {
    datetime: new JSTDateTime({
      year: yearMonth.year,
      month: yearMonth.month,
      date: record.hour.date,
      hour: record.hour.hour,
    }),
    dataUsageAmounts: record.dataUsageAmounts,
  };
}

class DB {
  private documentClient: AWS.DynamoDB.DocumentClient;

  constructor() {
    this.documentClient = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION,
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

  // Returns an array of DataUsageRecord sorted by datetime
  public async getUsageRecordsOfMonth(user: User, datetime: JSTDateTime): Promise<DataUsageRecord[]> {
    return new Promise((resolve, reject) => {
      const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: {
          pk: JSTDateTimeToPk(datetime),
          sk: user.id,
        },
      };
      this.documentClient.get(params, (error, data) => {
        if (error) reject(error);
        const monthlyRecord = data.Item as DBMonthlyRecord;
        resolve(
          monthlyRecord.records
            .map(dbRecord => DBRecordToDataUsageRecord(datetime, dbRecord))
            .sort((record1, record2) => JSTDateTime.compare(record1.datetime, record2.datetime))
        );
      });
    });
  }

  public async addDataUsageRecord(user: User, record: DataUsageRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: {
          pk: JSTDateTimeToPk(record.datetime),
          sk: user.id,
        },
        UpdateExpression: 'SET #r = list_append(if_not_exists(#r, :e), :r)',
        ExpressionAttributeNames: {
          '#r': 'records'
        },
        ExpressionAttributeValues: {
          ':e': [],
          ':r': [DataUsageRecordToDBRecord(record)],
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