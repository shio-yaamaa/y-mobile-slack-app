import * as request from 'request';
import * as cheerio from 'cheerio';

import { User, DataUsageAmounts } from '../types';

const baseUrl = 'https://my.ymobile.jp/';
const loginEndpoint = '/muc/d/auth/doLogin/';
const topEndpoint = '/muc/d/top/';
const contractEndpoint = `/muc/d/webLink/doSend/MWBWL0020`;
const usageEndpoint = '/muc/d/webLink/doSend/MRERE0000';

// Some information is only available in the smartphone page
const smartphoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

class YmobilePageReader {
  private user: User;
  private baseRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
  private isLoggedIn: boolean = false;

  constructor(user: User) {
    this.user = user;

    const jar = request.jar();
    this.baseRequest = request.defaults({
      baseUrl,
      headers: {
        'User-Agent': smartphoneUserAgent,
      },
      jar,
      followAllRedirects: true,
    });
  }

  private async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.baseRequest.post(
        loginEndpoint,
        {
          form: {
            ...this.user.ymobileCredential,
            mid: '',
          }
        },
        error => {
          if (error) reject(error);
          this.isLoggedIn = true;
          resolve();
        },
      );
    });
  }

  private async getInitialDataUsageCapacity(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.baseRequest.get(
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
  
          this.baseRequest.post(
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
  }

  private async getCurrentDataUsage(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.baseRequest.get(
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
  }

  private async getRemainingDataUsage(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.baseRequest.get(
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
  
          this.baseRequest.post(
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
  }

  public async getDataUsage(): Promise<DataUsageAmounts> {
    if (!this.isLoggedIn) {
      await this.login();
    }
    const initialDataUsageCapacity = await this.getInitialDataUsageCapacity();
    const currentDataUsage = await this.getCurrentDataUsage();
    const remainingDataUsage = await this.getRemainingDataUsage();
    return {
      capacity: Math.max(initialDataUsageCapacity, currentDataUsage + remainingDataUsage),
      current: currentDataUsage,
    };
  }
}

export default YmobilePageReader;