import multer from 'multer';
import uuid from 'uuid';
import _ from 'underscore';

export default function upload(options) {
  options = _.defaults({}, options, {
    type: 'files',
  })
  let storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, BASE_PATH + 'uploads/' + type);
    },
    filename: function (req, file, callback) {
      callback(null, uuid.v4());
    }
  });
  return multer({storage: storage});
}
