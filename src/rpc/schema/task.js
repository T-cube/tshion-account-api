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
  },
  task_model_add:{
    sanitization:{
      invokeName:{type:'string'},
      name:{type:'string'},
      html:{type:'string'},
      subject:{type:'string'},
      templateType:{type:'number'}
    },
    validation:{
      invokeName:{type:'string'},
      name:{type:'string'},
      html:{type:'string'},
      subject:{type:'string'},
      templateType:{type:'number'}
    }
  },
  email_task_create:{
    sanitization:{
      target:{type:'array'},
      sendAll:{$enum:[0,1]},
      userId:{type:'string'},
      username:{type:'username'},
      type:{type:'string'},
      content:{type:'string'},
      gallery:{type:'string'},
      templateInvokeName:{type:'string'},
      status:{type:'number'},
      name:{type:'string'}
    },
    validation:{
      target:{type:'array'},
      sendAll:{$enum:[0,1]},
      userId:{type:'string'},
      username:{type:'username'},
      type:{type:'string'},
      content:{type:'string'},
      gallery:{type:'string'},
      templateInvokeName:{type:'string'},
      status:{type:'number'},
      name:{type:'string'}
    }
  }
};

export const validate = buildValidator(schema);