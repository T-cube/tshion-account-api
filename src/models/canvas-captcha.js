import Canvas from 'canvas';
import Promise from 'bluebird';

export default class Captcha {

  /**
   * constructor
   * @param {Object} options include captchaNumber, lineNumber, circleNumber
   */

  constructor(options) {
    let self = this;
    self.captchaNumber = options.captchaNumber;
    self.lineNumber = options.lineNumber;
    self.circleNumber = options.circleNumber;
  }

  create() {
    let self = this;
    return new Promise((resolve) => {
      let captchaWidth = self.captchaNumber * 30 + 5;
      let canvas = new Canvas(captchaWidth, 60);
      let ctx = canvas.getContext('2d');
      let str = 'ABCDEFGHJKLMNPQRSTUVWXYabcdefhijkmnpqrstuvwxy345678';
      let fontStyle = ['normal', 'oblique'];
      let fontFamily = ['Arial', 'sans-serif'];
      let xaxisStart = 10;
      let captcha = '';
      function colorRandom() {
        return 'rgb(' + Math.floor(Math.random() * 200) + ',' + Math.floor(Math.random() * 200) + ',' + Math.floor(Math.random() * 200) + ')';
      }
      function xaxisRandom() {
        return Math.ceil(Math.random() * captchaWidth);
      }
      function yaxisRandom() {
        return Math.ceil(Math.random() * 60);
      }
      let color = colorRandom();
      for(let i = 0; i < self.captchaNumber; i++) {
        ctx.save();
        let singleCaptcha = str.charAt(Math.floor(Math.random() * str.length));
        let rotateChange = Math.random() * 1-0.5;
        captcha += singleCaptcha;
        ctx.font = fontStyle[Math.floor(Math.random()*2)] + ' ' + Math.ceil(Math.ceil(Math.random()*15)+35)+'px ' + + fontFamily[Math.floor(Math.random()*2)];
        ctx.fillStyle =  color;
        ctx.fillText(singleCaptcha, xaxisStart+Math.ceil(Math.random()*5 - 10), 50+Math.ceil(Math.random()*5 - 10));
        ctx.rotate(rotateChange);
        xaxisStart += 30;
        ctx.restore();
      }
      for(let i = 0; i < self.lineNumber; i++) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.lineTo(xaxisRandom(), yaxisRandom());
        ctx.lineTo(xaxisRandom(), yaxisRandom());
        ctx.lineWidth = Math.floor(Math.random()*6);
        ctx.stroke();
      }
      for(let i = 0; i < self.circleNumber; i++) {
        ctx.beginPath();
        ctx.fillStyle =  color;
        ctx.arc(xaxisRandom(), yaxisRandom(), Math.ceil(Math.random()* 2), 0, 2*Math.PI);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      resolve({captcha, canvas});
    });
  }
}
