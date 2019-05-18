import axios from 'axios';
import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as Sentry from '@sentry/node';

import { User } from '../types';

import JSTDateTime from '../lib/JSTDateTime';
import DB from '../lib/DB';
import Chart from '../lib/Chart';
import URLShortener from '../lib/URLShortener';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const notifySingleUser = async (currentDateTime: JSTDateTime, user: User): Promise<void> => {
  const records = await DB.getUsageRecordsOfMonth(user, currentDateTime);
  const originalUrl = new Chart(currentDateTime, records).toUrl();
  const shortenedUrl = await URLShortener.shorten(originalUrl);
  const chartBlock = {
    type: 'image',
    block_id: 'chart',
    image_url: shortenedUrl,
    alt_text: 'Chart',
  };
  await axios.post(user.slackWebhookUrl, {
    blocks: [chartBlock],
  });
};

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  // TODO: Error handling
  const currentDateTime = new JSTDateTime();
  const users = await DB.getAllUsers();
  for (const user of users) {
    await notifySingleUser(currentDateTime, user);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
