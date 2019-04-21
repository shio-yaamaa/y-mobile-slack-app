import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as request from 'request';
import * as cheerio from 'cheerio';

const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

interface Credential {
  msn: string; // Softbank refers to phone numbers as "msn"
  password: string;
}

// In GB
interface DataUsageInfo {
  total: number; // Current + remaining usage
  current: number;
}

const baseUrl = 'https://my.ymobile.jp/';
const loginEndpoint = '/muc/d/auth/doLogin/';
const topEndpoint = '/muc/d/top/';
const usageEndpoint = '/muc/d/webLink/doSend/MRERE0000';

// Some information is only available in the smartphone page
const smartphoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

const login = async (baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>, credential: Credential): Promise<void> => {
  return new Promise((resolve, reject) => {
    baseRequest.post(
      loginEndpoint,
      {
        form: {
          ...credential,
          mid: '',
        }
      },
      error => {
        if (error) reject(error);
        resolve();
      },
    );
  });
};

const getCurrentDataUsage = async (baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>): Promise<number> => {
  return new Promise((resolve, reject) => {
    baseRequest.get(
      topEndpoint,
      (error, _response, body) => {
        if (error) reject(error);

        const $ = cheerio.load(body);
        // This might break when the DOM structure of the page changes.
        // But there are very few IDs or classes that can be used to identify the target element.
        const dataAmountContainer = $('#data_amount');
        const rightColumn = dataAmountContainer.children().eq(1).children().eq(1);
        const dataAmountRow = (() => {
          let currentRow = rightColumn.children().first();
          while (currentRow.hasClass('status')) {
            currentRow = currentRow.next();
          }
          return currentRow;
        })();
        const dataAmountElement = dataAmountRow.children().eq(1);
        const currentDataUsage = parseFloat(dataAmountElement.text());

        if (isNaN(currentDataUsage)) reject(new Error('Invalid current data usage'));

        resolve(currentDataUsage);
      },
    );
  });
};

const getRemainingDataUsage = async (baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>): Promise<number> => {
  return new Promise((resolve, reject) => {
    baseRequest.get(
      usageEndpoint,
      (error, _response, body) => {
        if (error) reject(error);

        const $ = cheerio.load(body);
        const form = $('form[name="webLink"]').first();
        const formAction = form.attr('action');
        const formData: { [key: string]: string } = {};
        form.children().filter('input').each((_index, input) => {
          formData[$(input).attr('name')] = $(input).attr('value');
        });

        baseRequest.post(
          formAction,
          {
            baseUrl: null,
            form: formData,
          },
          (error, _response, body) => {
            if (error) reject(error);

            const $ = cheerio.load(body);
            // This might break when the DOM structure of the page changes.
            // But there are very few IDs or classes that can be used to identify the target element.
            const contractInfoTables = $('table.contract-info');
            const remainingDataUsageRow = contractInfoTables.find('tr').filter((_index, row) => {
              return $(row).text().includes('追加料金課金までの残りデータ量');
            }).first();
            const remainingDataUsageText = remainingDataUsageRow.children().eq(1).text();
            const remainingDataUsage = parseFloat(remainingDataUsageText.split('（')[0]); // Unit is automatically ignored

            if (isNaN(remainingDataUsage)) reject(new Error('Invalid remaining data usage'));

            resolve(remainingDataUsage);
          },
        );
      },
    );
  });
};

const getDataUsageInfoForSingleUser = async (): Promise<DataUsageInfo> => {
  const jar = request.jar();

  const baseRequest = request.defaults({
    baseUrl,
    headers: {
      'User-Agent': smartphoneUserAgent,
    },
    jar,
    followAllRedirects: true,
  });

  const credential: Credential = {
    msn: '',
    password: '',
  };
  await login(baseRequest, credential);
  const currentDataUsage = await getCurrentDataUsage(baseRequest);
  const remainingDataUsage = await getRemainingDataUsage(baseRequest);
  return {
    total: currentDataUsage + remainingDataUsage,
    current: currentDataUsage,
  };
};

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  try {
    getDataUsageInfoForSingleUser();
  } catch (error) {
    Sentry.captureException(error);
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Success',
      input: event,
    }),
  };
};
