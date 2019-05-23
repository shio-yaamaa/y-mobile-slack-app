import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as Sentry from '@sentry/node';

import PatientPromise from '../lib/PatientPromise';
import JSTDateTime from '../lib/JSTDateTime';
import DB from '../lib/DB';
import YmobilePageReader from '../lib/YmobilePageReader';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

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

  const promises = users.map(async user => {
    const dataUsageAmounts = await new YmobilePageReader(user).getDataUsage();
    await DB.addDataUsageRecord(
      user,
      {
        datetime: currentDateTime,
        dataUsageAmounts: dataUsageAmounts,
      },
    );
  });
  const results = await PatientPromise.all<void>(promises, error => Sentry.captureException(error));
  const didAllSucceed = promises.length == results.length;

  return {
    statusCode: didAllSucceed ? 200 : 500,
    body: didAllSucceed ? 'Success' : 'At least one user failed',
  };
};
