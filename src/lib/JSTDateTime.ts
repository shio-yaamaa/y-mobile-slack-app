import * as moment from 'moment-timezone';

moment.tz.setDefault('Asia/Tokyo');

class JSTDateTime {
  private moment: moment.Moment;

  constructor(time? : {year: number, month: number, date: number, hour: number}) {
    this.moment = moment(time);
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

  // Used as a compare function when sorting datetimes in ascending order
  public static compare(datetime1: JSTDateTime, datetime2: JSTDateTime): number {
    return datetime1.moment.valueOf() - datetime2.moment.valueOf();
  }
}

export default JSTDateTime;