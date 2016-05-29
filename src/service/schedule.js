import _ from 'underscore';
import scheduleService from 'node-schedule';
import ScheduleModel from 'models/schedule';

export default class ScheduleServer {

  constructor() {

  }

  init() {
    this.doJobs();
  }

  initJobs() {
    let scheduleModel = new ScheduleModel(db, this.model('notification'));
    this.jobs = {
      schedule_reminding: {
        init: ['*/5 * * * *', () => {
          scheduleModel.remindingJob()
        }]
      }
    }
  }

  doJobs() {
    this.initJobs()
    _.each(this.jobs, job => {
      job.worker = scheduleService.scheduleJob(...job.init)
    })
  }

}
