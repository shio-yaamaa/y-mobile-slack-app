import { ChartConfiguration } from 'chart.js';

import { DataUsageRecord } from '../types';

import JSTDateTime from '../lib/JSTDateTime';

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
      labels.push(currentHour.hour === 0 ? currentHour.date.toString() : '');
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
            label: 'Data Usage',
            data: currentDataUsageList,
            fill: true,
          },
          {
            label: 'Expected Data Usage',
            data: expectedDataUsageList,
            fill: false,
          },
        ],
      },
      options: {
        spanGaps: true,
      },
    };
  }

  public toUrl(): string {
    const chartConfig = this.toConfig();
    const chartConfigString = JSON.stringify(chartConfig)
      .replace(/\s+/g, '') // TODO: Don't remove the spaces in the label
      .replace(/null/g, '')
      .replace(/""/g, ''); // Remove empty strings in labels
    return `${quickchartUrl}?c=${chartConfigString}`;
  }
}

export default Chart;