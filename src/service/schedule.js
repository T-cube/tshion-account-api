import _ from 'underscore';
import scheduleService from 'node-schedule';
import ScheduleModel from 'models/schedule';

export default class ScheduleService {

  constructor() {
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
    this.jobs.forEach(job => {
      job.worker = scheduleService.scheduleJob(...job.init);
    })
  }

}
