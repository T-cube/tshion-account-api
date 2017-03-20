import _ from 'underscore';

export const IMAGE_VIEW2 = 'imageView2';
export const IMAGE_MOGR2 = 'imageMogr2';

/*
imageView2/<mode>
          /w/<LongEdge>
          /h/<ShortEdge>
          /format/<Format>
          /interlace/<Interlace>
          /q/<Quality>
          /ignore-error/<ignoreError>

imageMogr2/auto-orient
          /thumbnail/<imageSizeGeometry>
          /strip
          /gravity/<gravityType>
          /crop/<imageSizeAndOffsetGeometry>
          /rotate/<rotateDegree>
          /format/<destinationImageFormat>
          /blur/<radius>x<sigma>
          /interlace/<Interlace>
          /quality/<quality>
          /size-limit/<sizeLimit>
*/

const IMAGE_OPTIONS_DEFINE = {
  [IMAGE_VIEW2]: [
    { name: 'mode', key: '', type: 'int', single: true },
    { name: 'width', key: 'w', type: 'int' },
    { name: 'height', key: 'h', type: 'int' },
    { name: 'format', key: 'format', type: 'string' },
    { name: 'interlace', key: 'interlace', type: 'int', default: 0 },
    { name: 'ignoreError', key: 'ignore-error', type: 'int', default: 0 },
  ],
  [IMAGE_MOGR2]: [
    { name: 'autoOrient', key: 'auto-orient', single: true },
    { name: 'thumbnail', key: 'thumbnail', type: 'string' },
    { name: 'strip', key: 'strip', type: 'bool', single: true },
    { name: 'gravity', key: 'gravity', type: 'string' },
    { name: 'rotate', key: 'rotate', type: 'int' },
    { name: 'crop', key: 'crop', type: 'string' },
    { name: 'format', key: 'format', type: 'string' },
    { name: 'blur', key: 'blur', type: 'int' },
    { name: 'interlace', key: 'interlace', type: 'int', default: 0 },
    { name: 'quality', key: 'quality', type: 'int' },
    { name: 'sizeLimit', key: 'size-limit', type: 'int' },
  ]
};

function decodeValue(type, value) {
  if (type == 'bool') {
    if (/^[01]$/.test(value)) {
      return !!parseInt(value);
    } else {
      return !!value;
    }
  } else if (type == 'int') {
    return parseInt(value);
  } else if (type == 'string') {
    return '' + value;
  } else {
    return value;
  }
}

function encodeValue(type, value) {
  if (type == 'bool') {
    return value ? 1 : 0;
  } else if (type == 'int') {
    return value;
  } else if (type == 'string') {
    return value;
  } else {
    return value;
  }
}

export default class QiniuImage {

  constructor(url) {
    this.options = {};
    this.parse(url);
    return this;
  }

  getDefine(processor) {
    return IMAGE_OPTIONS_DEFINE[processor];
  }

  parse(url) {
    let arr = url.split('?');
    this.url = arr[0];
    if (arr.length == 1) return;
    let params = arr[1].split('/');
    let processor = params[0];
    let define = this.getDefine(processor);
    if (!processor) {
      return;
    }
    let option = {};
    let i = 1;
    if (processor == IMAGE_VIEW2) {
      option.mode = parseInt(params[i++]);
    }
    while (i < params.length) {
      let key = params[i++];
      let field = _.findWhere(define, {key: key});
      if (!field) {
        throw new Error(`invalid image option "${key}"`);
      }
      if (field.single) {
        option[field.name] = true;
      } else if (i < params.length){
        option[field.name] = decodeValue(field.type, params[i++]);
      }
    }
    this.options = {
      [processor]: option,
    };
  }

  setCrop({x, y, width, height}) {
    const cropOption = `!${width}x${height}a${x}a${y}`;
    this.setEffect({
      [IMAGE_MOGR2]: {
        crop: cropOption,
      },
    });
    return this;
  }

  getCrop() {
    const pattern = /^!(\d+)x(\d+)a(\d+)a(\d+)$/;
    const cropOption = this.options && this.options[IMAGE_MOGR2] && this.options[IMAGE_MOGR2].crop;
    if (!cropOption) return null;
    const data = pattern.exec(cropOption);
    if (!data) return null;
    const [, width, height, x, y] = data;
    return {x, y, width, height};
  }

  setEffect(options) {
    if (_.isObject(options) && (options[IMAGE_VIEW2] || options[IMAGE_MOGR2])) {
      this.options = options;
    }
  }

  getEffect() {
    return this.options;
  }

  clearEffect() {
    this.options = {};
  }

  baseUrl() {
    return this.url;
  }

  toString() {
    const options = this.options;
    const processors = _.keys(options);
    if (processors.length == 0) {
      return this.url;
    }
    const processor = processors[0];
    const option = options[processor];
    const define = this.getDefine(processor);
    if (!define) {
      return this.url;
    }
    let str = processor;
    if (processor == IMAGE_VIEW2) {
      str += '/' + option.mode;
    }
    _.each(define, field => {
      const name = field.name;
      let value = option[name];
      if (_.isUndefined(value)) {
        return;
      }
      if (field.single && value) {
        str += `/${field.key}`;
      } else {
        value = encodeValue(field.type, value);
        str += `/${field.key}/${value}`;
      }
    });
    return this.url + '?' + str;
  }
}
