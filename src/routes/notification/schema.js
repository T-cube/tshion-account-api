export let readSanitization = {
  ids: {
    type: 'array',
		items: { $objectId: 1 },
  }
}

export let readValidation = {
  ids: {
    type: 'array',
		items: { $objectId: 1 },
  }
}
