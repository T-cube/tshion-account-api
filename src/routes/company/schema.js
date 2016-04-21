export let companySanitization = {
  name: { type: "string" },
  description: { type: "string" },
  // structure: {
	// 	type: 'object',
	// 	properties: {
	// 		_id: { $objectId: 1 },
	// 		name: { type: 'string' },
	//     positions: {
	// 			$emptyArray: 1,
	// 			def: [],
	// 			optional: true
	// 		},
	//     members: {
	// 			type: 'array',
	// 			items: [{
	// 				type: "object",
	// 				properties: {
	// 					_id: { $userId: 1 },
	// 	      	title: { type: 'string' }
	// 				}
	// 			}]
	//     }
	// 	}
	// },
	// projects: {
	// 	$emptyArray: 1,
	// 	def: [],
	// 	optional: true
	// },
};

export let companyValidation = {
  name: { type: "string", minLength: 1, maxLength: 100 },
  description: { type: "string", maxLength: 1000000 },
  // structure: {
	// 	type: 'object',
	// 	properties: {
	// 		_id: { $objectId: 1 },
	// 		name: { type: 'string' },
	//     members: {
	// 			type: 'array',
	// 			items: {
	// 				_id: { $objectId: 1 },
	// 	      title: { type: 'string' }
	// 			}
	//     }
	// 	}
	// },
	// projects: { type: 'array' },
};

export let structureSanitization = {
	name: { type: 'string' },
	description: { type: 'string' }
};

export let structureValidation = {
	name: { type: 'string' },
	description: { type: 'string' }
};

export let memberCreateSanitization = {
	title: { type: 'string' }
};

export let memberCreateValidation = {
	title: { type: 'string' }
};

export let memberUpdateSanitization = {
	title: { type: 'string' },
	is_manager: { type: 'boolean' }
};

export let memberUpdateValidation = {
	title: { type: 'string' },
	is_manager: { type: 'boolean' }
};
