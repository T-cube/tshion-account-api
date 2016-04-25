export let sanitization = {
	// You can edit the sanitization too
	type: "object",
	properties: {
    title: { type: "string" },
    content: { type: "string" },
    from: {
      type: 'object',
      properties: {
        creator: { $objectId: true },
        department: { $objectId: true },
      }
    },
    to: {
      type: 'object',
      properties: {
        member: {
    			type: "array",
    			items: { $objectId: true }
    		},
        department: {
    			type: "array",
    			items: { $objectId: true }
    		},
      }
    },
    date_publish: { type: "date" },
  }
};

export let validation = {
	type: "object",
	properties: {
    title: { type: "string", minLength: 1, error: '请填写标题' },
    content: { type: "string", minLength: 1, maxLength: 1000000 },
    from: {
      type: 'object',
      properties: {
        creator: { $objectId: true },
        department: { $objectId: true }
      }
    },
    to: {
      type: 'object',
      properties: {
        member: {
    			type: "array",
    			items: { $objectId: true }
    		},
        department: {
    			type: "array",
    			items: { $objectId: true }
    		},
      }
    },
    date_publish: { type: "date", exec: function(schema, post){
			if (new Date(post).getTime() <= new Date().getTime()) {
				this.report('wrong date time');
			}} },
  }
};
