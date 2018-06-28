var crypto = require('crypto');
var fs = require('fs');

class RsaUtil {
  constructor() {
    this.private_key = fs.readFileSync('./rsa_private_key.pem');
    this.public_key = fs.readFileSync('./rsa_public_key.pem');
  }

  decryptFromHex(hex) {
    let arrayBuffer = [];
    for (let i = 0; i < hex.length / 2; i++) {
      arrayBuffer.push(parseInt(hex.substr(i * 2, 2), 16));
    }

    const buffer = new Buffer(arrayBuffer);

    return this.decryptFromBuffer(buffer);
  }

  decryptFromBuffer(buffer) {
    const decryptHex = crypto.privateDecrypt({
      key: this.private_key,
      // 这里添加padding选项，java中rsa加密默认添加此项，所以统一都添加此项
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, buffer);

    return decryptHex.toString('utf-8');
  }

  encrypt(str) {
    let hex = crypto.publicEncrypt({
      key: this.public_key,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, new Buffer(str));
    return hex;
  }
}

let hex = new RsaUtil().encrypt('18705928625');
console.log(hex.toString('hex'));
