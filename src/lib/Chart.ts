import { ChartConfiguration } from 'chart.js';

import { DataUsageRecord } from '../types';

import JSTDateTime from '../lib/JSTDateTime';
import { typeOf } from '../lib/Utility';

const quickchartUrl = 'https://quickchart.io/chart';

class Chart {
  constructor(private month: JSTDateTime, private records: DataUsageRecord[]) { }

  private toConfig(): ChartConfiguration {
    const capacity = Math.max(...this.records.map(record => record.dataUsageAmounts.capacity));

    const labels: string[] = [];
    const currentDataUsageList: (number | null)[] = [];
    const expectedDataUsageList: (number | null)[] = [];
    
    let currentRecordIndex = 0;
    let currentHour = this.month.toStartOf('month');
    const end = currentHour.add(1, 'month');
    while (currentHour.isBefore(end)) { // Don't include the start of the next month
      // Advance currentRecordIndex until it reaches the record for currentHour
      while (currentRecordIndex < this.records.length - 1 && this.records[currentRecordIndex].datetime.isBefore(currentHour)) {
        currentRecordIndex++;
      }

      const record: DataUsageRecord | null = (currentRecordIndex < this.records.length - 1 && this.records[currentRecordIndex].datetime.isSame(currentHour))
        ? this.records[currentRecordIndex]
        : null;
      labels.push((currentHour.date % 5 === 0 && currentHour.hour === 0) ? currentHour.date.toString() : '');
      currentDataUsageList.push(record ? record.dataUsageAmounts.current : null);
      expectedDataUsageList.push(null);
      
      currentHour = currentHour.add(1, 'hour');
    }

    currentDataUsageList[0] = currentDataUsageList[0] === null ? 0 : currentDataUsageList[0];
    expectedDataUsageList[0] = 0;
    expectedDataUsageList[expectedDataUsageList.length - 1] = capacity;

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Expected Data Usage',
            data: expectedDataUsageList,
            borderWidth: 1,
            borderColor: '#666666',
            fill: false,
          },
          {
            label: 'Data Usage',
            data: currentDataUsageList,
            borderColor: 'transparent', // borderWidth: 0 doesn't work
            fill: true,
            backgroundColor: '#17B4CD',
          },
        ],
      },
      options: {
        layout: {
          padding: {
            top: 30,
            bottom: 20,
            left: 20,
            right: 0,
          },
        },
        spanGaps: true,
        scales: {
          xAxes: [{
            gridLines: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
            },
          }],
          yAxes: [{
            gridLines: {
              lineWidth: 0.5,
              drawBorder: false,
            },
            ticks: {
              padding: 5,
            },
          }],
        },
        elements: {
          point: {
            radius: 0,
          },
        },
        legend: {
          display: false,
        }
      },
    };
  }

  private toStringConfig(): string {
    const stringify = (target: any, isArrayElement: boolean): string => { // When isArrayElement, the result can be an empty string
      switch (typeOf(target)) {
        case 'number':
        case 'boolean':
          return target.toString();
        case 'string':
          if (target.length === 0) {
            return isArrayElement ? '' : `''`;
          }
          return `'${encodeURIComponent(target)}'`;
        case 'array':
          return `[${target.map((element: any) => stringify(element, true)).join(',')}]`;
        case 'object':
          const stringifiedEntries = Object.entries(target)
            .map(([key, value]) => `${key}:${stringify(value, false)}`);
          return `{${stringifiedEntries.join(',')}}`;
        case 'null':
        case 'undefined':
          return isArrayElement ? '' : 'null';
        default:
          return JSON.stringify(target);
      }
    };
    return stringify(this.toConfig(), false);
  }

  public toUrl(): string {
    return `${quickchartUrl}?bkg=white&c=${this.toStringConfig()}`;
  }
}

export default Chart;