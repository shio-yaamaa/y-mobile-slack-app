import axios from 'axios';
import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const webhookUrl = `https://hooks.slack.com/services/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`;
  const imageUrl = 'https://4.bp.blogspot.com/-ick5MzawERQ/XGjx4C7m8SI/AAAAAAABRcg/3uCtQPn3VxQBvtK8_97xwYDcxPhZgoJHQCLcBGAs/s400/food_soup_pan.png';
  const chartBlock = {
    type: 'image',
    block_id: 'chart',
    image_url: imageUrl,
    alt_text: 'Chart',
  };
  await axios.post(webhookUrl, {
    blocks: [chartBlock],
  });
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
