import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

const quickchartUrl = 'https://quickchart.io/chart';

interface DailyStatistics {
  date: number;
  hour: number;
  availableAmount: number;
  dailyUsage: number;
  currentUsage: number;
}

const generateChartConfig = (data: DailyStatistics[]): Object => {
  return {};
};

const generateChartUrl = (data: DailyStatistics[]): string => {
  const chartConfig = generateChartConfig(data);
  const chartConfigString = encodeURIComponent(JSON.stringify(chartConfig));
  return `${quickchartUrl}?c=${chartConfigString}`;
};

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
