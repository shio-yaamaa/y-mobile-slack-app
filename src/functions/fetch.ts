import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as request from 'request';
import * as cheerio from 'cheerio';
import * as Sentry from '@sentry/node';

import { User, YmobileCredential, DataUsageAmounts } from '../types';

import JSTDateTime from '../lib/JSTDateTime';
import DB from '../lib/DB';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const baseUrl = 'https://my.ymobile.jp/';
const loginEndpoint = '/muc/d/auth/doLogin/';
const topEndpoint = '/muc/d/top/';
const contractEndpoint = `/muc/d/webLink/doSend/MWBWL0020`;
const usageEndpoint = '/muc/d/webLink/doSend/MRERE0000';

// Some information is only available in the smartphone page
const smartphoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

const login = async (baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>, credential: YmobileCredential): Promise<void> => {
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

const getInitialDataUsageCapacity = async (baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>): Promise<number> => {
  return new Promise((resolve, reject) => {
    baseRequest.get(
      contractEndpoint,
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
            const contractDetailContainer = $('.contractual_detail');
            const currentContractTitle = contractDetailContainer.children().filter((_index, element) => {
              return $(element).text().includes('現在のご契約');
            }).first();
            const currentContractWrap = currentContractTitle.next();
            const dataAmountBox = currentContractWrap.find('.unit-box').eq(1);
            const dataAmountElement = dataAmountBox.children().eq(0).children().eq(0).children().eq(1);
            const dataUsageCapacity = parseFloat(dataAmountElement.text()); // Unit is automatically ignored

            if (isNaN(dataUsageCapacity)) reject(new Error('Invalid data usage capacity'));

            resolve(dataUsageCapacity);
          },
        );
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

const getDataUsageForSingleUser = async (user: User): Promise<DataUsageAmounts> => {
  const jar = request.jar();

  const baseRequest = request.defaults({
    baseUrl,
    headers: {
      'User-Agent': smartphoneUserAgent,
    },
    jar,
    followAllRedirects: true,
  });

  await login(baseRequest, user.ymobileCredential);
  const initialDataUsageCapacity = await getInitialDataUsageCapacity(baseRequest);
  const currentDataUsage = await getCurrentDataUsage(baseRequest);
  const remainingDataUsage = await getRemainingDataUsage(baseRequest);
  return {
    capacity: Math.max(initialDataUsageCapacity, currentDataUsage + remainingDataUsage),
    current: currentDataUsage,
  };
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
  
  // Resolves with an error (do not throw it) when error occurs
  // so that Promise.all waits until all the tasks finish
  // even if some of them fail.
  const fetchForUser = async (user: User): Promise<void | Error> => {
    try {
      const dataUsageAmounts = await getDataUsageForSingleUser(user);
      await DB.addDataUsageRecord(
        user,
        {
          datetime: currentDateTime,
          dataUsageAmounts: dataUsageAmounts,
        },
      );
      return;
    } catch (error) {
      Sentry.captureException(error);
      return error;
    }
  };

  const results = await Promise.all(users.map(user => fetchForUser(user)));
  const didAllSucceed = results.every(result => !(result instanceof Error));
  return {
    statusCode: didAllSucceed ? 200 : 500,
    body: didAllSucceed ? 'Success' : 'At least one user failed',
  };
};
