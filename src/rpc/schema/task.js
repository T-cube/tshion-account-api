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
      templateName:{type:'string'}
    },
    validation: {
      name: { type: 'string' },
      content: { type: 'string' },
      target:{ type:'array' },
      userId:{ type:'string' },
      sendAll:{type:'number'},
      templateId:{type:'number'},
      templateName:{type:'String'}
    }
  }
};

export const validate = buildValidator(schema);