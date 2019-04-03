import axios from 'axios';
import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const webhookUrl = `https://hooks.slack.com/services/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`;
  await axios.post(webhookUrl, {
    text: 'Hello from Lambda'
  });
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
