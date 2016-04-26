export let authoriseSanitization = {
  password: { type: "string" },
};

export let authoriseValidation = {
  password: { type: "string", minLength: 6, maxLength: 20 },
};
