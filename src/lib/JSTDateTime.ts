import * as moment from 'moment-timezone';

moment.tz.setDefault('Asia/Tokyo');

class JSTDateTime {
  private moment: moment.Moment;

  constructor(time? : {year: number, month: number, date: number, hour: number}) {
    this.moment = moment(time);
  }

  private static fromMoment(moment: moment.Moment): JSTDateTime {
    const datetime = new JSTDateTime();
    datetime.moment = moment;
    return datetime;
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

  public isSame(another: JSTDateTime): boolean {
    return this.moment.isSame(another.moment);
  }

  public isBefore(another: JSTDateTime): boolean {
    return this.moment.isBefore(another.moment);
  }

  public add(amount: number, unit: moment.unitOfTime.Base): JSTDateTime {
    const addedMoment = this.moment.clone().add(amount, unit);
    return JSTDateTime.fromMoment(addedMoment);
  }

  public toStartOf(unit: moment.unitOfTime.Base): JSTDateTime {
    const startMoment = this.moment.clone().startOf(unit);
    return JSTDateTime.fromMoment(startMoment);
  }
}

export default JSTDateTime;