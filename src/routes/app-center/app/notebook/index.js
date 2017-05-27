import { ApiError } from 'lib/error';
import { ObjectId } from 'mongodb';
import express from 'express';


let api = express.Router();
export default api;

function requestError() {
  throw new ApiError('400', 'params_missing');
}



// api.use('/', (req, res, next) => {
//   next();
// });

api.get('/user', (req, res, next) => {
  req._app.list({ company_id: req.query.company_id, user_id: req.query.user_id }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/tag', (req, res, next) => {
  req.query.tag_id || requestError();
  req._app.tagQuery({company_id: req.query.company_id, user_id: req.query.user_id, tag_id: req.query.tag_id}).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/note', (req, res, next) => {
  req.query.note_id || requestError();
  req._app.noteQuery({company_id: req.query.company_id, user_id: req.query.user_id, note_id: req.query.note_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/notebook', (req, res, next) => {
  req.query.notebook_id || requestError();
  req._app.notebookQuery({company_id: req.query.company_id, user_id: req.query.user_id, notebook_id: req.query.notebook_id}).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/shared', (req, res, next) => {
  req._app.sharedQuery({company_id: req.query.company_id, user_id: req.query.user_id }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/comment', (req, res, next) => {
  req.query.note_id || requestError();
  req._app.commentQuery({company_id: req.query.company_id, note_id: req.query.note_id }).then(list => {
    res.json(list);
  }).catch(next);
});

api.post('/tag', (req, res, next) => {
  let tag_name = req.body.tag_name;
  req._app.tagAdd({company_id: req.query.company_id, user_id: req.query.user_id, tag_name}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/notebook', (req, res, next) => {
  let notebook_name = req.body.notebook_name;
  req._app.notebookAdd({company_id: req.query.company_id, user_id: req.query.user_id, notebook_name}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note', (req, res, next) => {
  let note = req.body.note;
  req._app.noteAdd({company_id: req.query.company_id, user_id: req.query.user_id, note}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/comment', (req, res, next) => {
  let comment = req.body.comment;
  req._app.commentAdd({company_id: req.query.company_id, user_id: req.query.user_id, comment}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/like', (req, res, next) => {
  req.query.note_id || requestError();
  req._app.likeAdd({user_id: req.query.user_id, note_id: req.query.note_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.delete('/tag', (req, res, next) => {
  req.query.tag_id || requestError();
  req.model('note').tagDelete({company_id: req.query.company_id, user_id: req.query.user_id, tag_id: req.query.tag_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.delete('/notebook', (req, res, next) => {
  req.query.notebook_id || requestError();
  req._app.notebookDelete({company_id: req.query.company_id, user_id: req.query.user_id, notebook_id: req.query.notebook_id}).then(list => {
    res.json(list);
  }).catch(next);
});

api.delete('/note', (req, res, next) => {
  req.query.note_id || requestError();
  req._app.noteDelete({company_id: req.query.company_id, user_id: req.query.user_id, note_id: req.query.note_id}).then(list => {
    res.json(list);
  }).catch(next);
});

api.delete('/like', (req, res, next) => {
  req.query.note_id || requestError();
  req._app.likeDelete({user_id: req.query.user_id, note_id: req.query.note_id}).then(list => {
    res.json(list);
  }).catch(next);
});

api.put('/tag', (req, res, next) => {
  let { tag_name, tag_id } = req.body;
  req._app.tagChange({user_id: req.query.user_id, company_id: req.query.company_id, tag_name, tag_id: ObjectId(tag_id)}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/notebook', (req, res, next) => {
  let { notebook_name, notebook_id } = req.body;
  req._app.notebookChange({user_id: req.query.user_id, company_id: req.query.company_id, notebook_name, notebook_id: ObjectId(notebook_id)}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/note', (req, res, next) => {
  let { title, content, note_id } = req.body;
  let note = { title, content, note_id: ObjectId(note_id) };
  req._app.noteChange({user_id: req.query.user_id, company_id: req.query.company_id, note}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/noteAddTag', (req, res, next) => {
  req.query.note_id && req.query.tag_id || requestError();
  req._app.noteAddTag({user_id: req.query.user_id, company_id: req.query.company_id, note_id: req.query.note_id, tag_id: req.query.tag_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/noteDeleteTag', (req, res, next) => {
  req.query.note_id && req.query.tag_id || requestError();
  req._app.noteDeleteTag({user_id: req.query.user_id, company_id: req.query.company_id, note_id: req.query.note_id, tag_id: req.query.tag_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/noteShare', (req, res, next) => {
  req.query.note_id || requestError();
  let { shared } = req.body;
  req._app.noteShare({user_id: req.query.user_id, company_id: req.query.company_id, note_id: req.query.note_id}, shared).then(doc => {
    res.json(doc);
  }).catch(next);
});
