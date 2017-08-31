
export let nodeSanitization = {
    name: { type: 'string' },
    description: { type: 'string', optional: true },
};
export let nodeValidation = {
    name: { type: 'string' },
    description: { type: 'string', optional: true },
};
export let memberSanitization = {
    _id: { $objectId: 1 },
    position: { $objectId: 1, optional: true }
};
export let memberValidation = {
    _id: { $objectId: 1 },
    position: { $objectId: 1, optional: true }
};
