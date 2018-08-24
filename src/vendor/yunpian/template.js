export function NationalVerifySms(signature, code) {
  return `【${signature}】您的验证码是${code}`;
  // return `Your Verification Code is ${code}.`;
}

export function VerifySms(code) {
  return `您的验证码是 ${code}`;
}
