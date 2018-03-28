import * as crypto from 'crypto';
import * as fs from 'fs';

import config from 'config';

const private_key = fs.readFileSync(config.get('account.private_key'));

/**
 * 解密rsa加密过后的字节数组生成的hash字符串
 * @param {String} hex 加密过后的字节流转换成的 hash 字符串
 * @returns {String}
 */
export function decryptFromHex(hex) {
  let arrayBuffer = [];
  for (let i = 0; i < hex.length / 2; i++) {
    arrayBuffer.push(parseInt(hex.substr(i * 2, 2), 16));
  }

  const buffer = new Buffer(arrayBuffer);

  return decryptFromBuffer(buffer);
}

/**
 * 解密rsa加密过后生成的buffer
 * @param {Buffer} buffer 加密过后生成的buffer
 * @returns {String}
 */
export function decryptFromBuffer(buffer) {
  var decryptHex = crypto.privateDecrypt({
    key: private_key,
    // 这里添加padding选项，java中rsa加密默认添加此项，所以统一都添加此项
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, buffer);

  return decryptHex.toString('utf-8');
}

export const decrypt = decryptFromBuffer;
