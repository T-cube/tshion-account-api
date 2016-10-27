import { ObjectId } from 'mongodb';

module.exports = [
  {
    _id: 1,
    name: '请假单',
    description: '请假单介绍',
    icon: '',
    forms: [{
      _id: ObjectId(),
      label: '开始时间',
      type: 'datetime',
      required: true
    }, {
      _id: ObjectId(),
      label: '结束时间',
      type: 'datetime',
      required: true
    }, {
      _id: ObjectId(),
      label: '工作代理人',
      type: 'text',
    }]
  },
  {
    _id: 2,
    name: '外出',
    icon: '',
  },
  {
    _id: 3,
    name: '报销',
    icon: '',
  },
];
