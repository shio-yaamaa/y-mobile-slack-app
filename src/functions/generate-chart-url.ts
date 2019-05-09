import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

import JSTDateTime from '../lib/JSTDateTime';
import DB from '../lib/DB';
import Chart from '../lib/Chart';

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  // TODO: Error handling
  const currentDateTime = new JSTDateTime();
  const users = await DB.getAllUsers();
  for (const user of users) {
    const records = await DB.getUsageRecordsOfMonth(user, currentDateTime);
    const chartUrl = new Chart(currentDateTime, records).toUrl();
    console.log(chartUrl);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
