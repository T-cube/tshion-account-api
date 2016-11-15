export default [
  {
    name: '请假单',
    description: '请假单',
    icon: '',
    forms: [{
      label: '开始时间',
      type: 'datetime',
      required: true
    }, {
      label: '结束时间',
      type: 'datetime',
      required: true
    }, {
      label: '工作代理人',
      type: 'text',
    }]
  },
  {
    name: '出差申请',
    description: '出差申请',
    icon: '',
    forms: [{
      label: '开始时间',
      type: 'datetime',
      required: true
    }, {
      label: '结束时间',
      type: 'datetime',
      required: true
    }, {
      label: '出差地',
      type: 'text',
    }, {
      label: '工作代理人',
      type: 'text',
    }]
  },
  {
    name: '外出申请',
    description: '外出申请',
    icon: '',
    forms: [{
      label: '开始时间',
      type: 'datetime',
      required: true
    }, {
      label: '结束时间',
      type: 'datetime',
      required: true
    }, {
      label: '目的地',
      type: 'text',
    }, {
      label: '工作代理人',
      type: 'text',
    }]
  },
  {
    name: '加班申请',
    description: '加班申请',
    icon: '',
    forms: [{
      label: '开始时间',
      type: 'datetime',
      required: true
    }, {
      label: '结束时间',
      type: 'datetime',
      required: true
    }, {
      label: '实际小时',
      type: 'number',
    }]
  },
  {
    name: '考勤补签',
    description: '考勤补签',
    icon: '',
    forms: [{
      label: '考勤时间',
      type: 'datetime',
      required: true
    }, {
      label: '类型',
      optionsKeyValueSame: false,
      required: true,
      type: 'radiogroup',
      options: [
        {
          label: '签到',
          value: 'sign_in'
        },
        {
          label: '签退',
          value: 'sign_out'
        }
      ]
    }]
  },
  {
    name: '转正申请',
    description: '转正申请',
    icon: '',
    forms: [{
      label: '入职时间',
      type: 'date',
      required: true
    }, {
      label: '转正时间',
      type: 'date',
      required: true
    }]
  },
  {
    name: '岗位调动申请',
    description: '岗位调动申请',
    icon: '',
    forms: [{
      label: '原岗位',
      type: 'text',
      required: true
    }, {
      label: '调往岗位',
      type: 'text',
      required: true
    }, {
      label: '调动时间',
      type: 'date',
      required: true
    }]
  },
  {
    name: '离职申请',
    description: '离职申请',
    icon: '',
    forms: [{
      label: '离职时间',
      type: 'date',
      required: true
    }, {
      label: '交接人员',
      type: 'text',
    }]
  },
];
