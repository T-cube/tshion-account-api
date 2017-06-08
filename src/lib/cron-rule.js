import _ from 'underscore';
import moment from 'moment';
import cronParser from 'cron-parser';

export default class CronRule {

  constructor() {}

  static transToRule(data, time) {
    let { info } = data;
    let datetime = time ? new Date(time) : moment().startOf('date').toDate();
    let newDate = datetime.getDate();
    let newMonth = datetime.getMonth();
    let rule = [datetime.getMinutes(), datetime.getHours()];

    switch (data.type) {
      case null:
        return null;
      case 'day':
        rule = rule.concat(['*', '*', '*']);
        break;
      case 'year':
        rule = rule.concat([newDate, newMonth, '*']);
        break;
      case 'month':
        info = info ? _.uniq(info).filter(i => /^([0-9]|([1-2]\d)|30)$/.test(i)).join(',') : newDate;
        rule = rule.concat([info, '*', '*']);
        break;
      case 'weekday':
        info = _.uniq(info).filter(i => /^[0-6]$/.test(i)).join(',');
        rule = rule.concat(['*', '*', info]);
        break;
      default:
        rule = rule.concat(['*', '*', '*']);
    }
    return rule.join(' ');
  }

  static transToData(rule) {
    let data = {};
    rule = rule.split(' ');
    rule.length == 6 && rule.shift();
    if (rule[2] == '*') {
      if (rule[4] == '*') {
        data = {
          type: 'day'
        };
      } else {
        let info = rule[4] ? rule[4].split(',') : [];
        return data = {
          type: 'weekday',
          info
        };
      }
    } else {
      if (rule[3] == '*') {
        let info = rule[2] ? rule[2].split(',') : [];
        data = {
          type: 'month',
          info
        };
      } else {
        data = {
          type: 'year'
        };
      }
    }
    return data;
  }

  static getNextTime(rule, currentDate, endDate) {
    let nextTime = null;
    try {
      let parseOptions = {};
      currentDate && (parseOptions.currentDate = currentDate);
      endDate && (parseOptions.endDate = endDate);
      let interval = cronParser.parseExpression(rule, parseOptions);
      nextTime = interval.next().toDate();
    } catch (e) {
      console.error('cronRule cronParser error:', e.message);
    }
    return nextTime;
  }

}
