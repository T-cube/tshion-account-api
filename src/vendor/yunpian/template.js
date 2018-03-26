export function NationalVerifySms(signature, code) {
  return `【${signature}】Your Verification Code is ${code}.`;
  // return `Your Verification Code is ${code}.`;
}

export function VerifySms(code) {
  return `您的验证码是 ${code}`;
}
