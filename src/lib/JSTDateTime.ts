import * as moment from 'moment-timezone';

moment.tz.setDefault('Asia/Tokyo');

class JSTDateTime {
  moment: moment.Moment;

  constructor() {
    this.moment = moment();
  }

  // For use as a primary key in the DB
  public toPk(): string {
    const paddedMonthString = `0${this.moment.month()}`.slice(-2);
    return `month-${this.moment.year()}${paddedMonthString}`;
  }
}

export default JSTDateTime;