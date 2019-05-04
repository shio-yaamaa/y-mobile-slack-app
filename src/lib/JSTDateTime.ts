import * as moment from 'moment-timezone';

moment.tz.setDefault('Asia/Tokyo');

class JSTDateTime {
  moment: moment.Moment;

  constructor() {
    this.moment = moment();
  }

  get year(): number {
    return this.moment.year();
  }

  get month(): number {
    return this.moment.month();
  }

  get date(): number {
    return this.moment.date();
  }

  get hour(): number {
    return this.moment.hour();
  }

  // For use as a primary key in the DB
  public toPk(): string {
    const paddedMonthString = `0${this.month}`.slice(-2);
    return `month-${this.year}${paddedMonthString}`;
  }
}

export default JSTDateTime;