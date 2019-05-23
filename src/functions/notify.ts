import axios from 'axios';
import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as Sentry from '@sentry/node';

import { User } from '../types';

import PatientPromise from '../lib/PatientPromise';
import JSTDateTime from '../lib/JSTDateTime';
import DB from '../lib/DB';
import Chart from '../lib/Chart';
import ImageUploader from '../lib/ImageUploader';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const notifySingleUser = async (currentDateTime: JSTDateTime, user: User): Promise<void> => {
  const records = await DB.getUsageRecordsOfMonth(user, currentDateTime);
  const chart = new Chart(currentDateTime, records);
  const s3Url = await ImageUploader.uploadImage(chart.url, await chart.toBuffer());
  const chartBlock = {
    type: 'image',
    block_id: 'chart',
    image_url: s3Url,
    alt_text: 'Chart',
  };
  await axios.post(user.slackWebhookUrl, {
    blocks: [chartBlock],
  });
};

export const handler: APIGatewayProxyHandler = async (_event, _context) => {
  const currentDateTime = new JSTDateTime();
  let users = [];
  try {
    users = await DB.getAllUsers();
  } catch (error) {
    Sentry.captureException(error);
    return {
      statusCode: 500,
      body: 'Could not get users from DB',
    };
  }

  const promises = users.map(user => notifySingleUser(currentDateTime, user));
  const results = await PatientPromise.all<void>(promises, error => Sentry.captureException(error));
  const didAllSucceed = promises.length == results.length;

  return {
    statusCode: didAllSucceed ? 200 : 500,
    body: didAllSucceed ? 'Success' : 'At least one user failed',
  };
};
