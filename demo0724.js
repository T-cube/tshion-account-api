const crypto=require('crypto');
const fs = require('fs');

const pem = fs.readFileSync('./runtime/account/rsa_public_key.pem');

const publicKey=`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCnu8Hb0dmXy9BQ5vudc+AEBlDH
w5ifCVthZrpaCaEcVIbFqacy6HcS3H6tmr3M1dMrs+YoLpSHdBtx2JsfS2fF7/W9
AzoTZ4ZILNZMP763pJlRC5mlbVpSuZ6fIN0HVdCcWm2qJ2XLtxh3WbY/8bEJmJ/A
KI7cd+JbJdX0wdaqbwIDAQAB
-----END PUBLIC KEY-----`;
// const publicKey='-----BEGIN PUBLIC KEY-----\n'+
// 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCnu8Hb0dmXy9BQ5vudc+AEBlDH\n'+
// 'w5ifCVthZrpaCaEcVIbFqacy6HcS3H6tmr3M1dMrs+YoLpSHdBtx2JsfS2fF7/W9\n'+
// 'AzoTZ4ZILNZMP763pJlRC5mlbVpSuZ6fIN0HVdCcWm2qJ2XLtxh3WbY/8bEJmJ/A\n'+
// 'KI7cd+JbJdX0wdaqbwIDAQAB\n'+
// '-----END PUBLIC KEY-----';
const telBuffer=new Buffer('18350150955');

let target=crypto.publicEncrypt(
  {
  	// key: pem,
    key:publicKey,
    padding:crypto.constants.RSA_PKCS1_PADDING
  },
  telBuffer
);

console.log(target.toString('hex'));