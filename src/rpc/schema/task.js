import { buildValidator } from 'lib/inspector';

const schema = {
  task_create:{
    sanitization: {
      name: { type: 'string' },
      content: { type: 'string' },
      target: { type: 'array' },
      userId:{ type:'string' },
      sendAll:{type:'number'},
      templateId:{type:'number'},
      templateName:{type:'string'},
      username:{type:'string'}
    },
    validation: {
      name: { type: 'string' },
      content: { type: 'string' },
      target:{ type:'array' },
      userId:{ type:'string' },
      sendAll:{type:'number'},
      templateId:{type:'number'},
      templateName:{type:'String'},
      username:{type:'string'}
    }
  },
  task_resend:{
    sanitization:{
      sendId:{type:'array'},
      sendAll:{type:'boolean'},
      type:{ $enum:['sms','email'] }
    },
    validation:{
      sendId:{type:'array'},
      sendAll:{type:'boolean'},
      type:{$enum:['sms','email']}
    }
  }
};

export const validate = buildValidator(schema);