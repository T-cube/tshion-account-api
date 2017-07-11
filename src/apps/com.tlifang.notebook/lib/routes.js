import express from 'express';
import { validate } from './schema';

let api = express.Router();
export default api;

api.get('/user', (req, res, next) => {
  req._app.list({
    company_id: req.company._id,
    user_id: req.user._id
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/tag', (req, res, next) => {
  req._app.listTag({
    company_id: req.company._id,
    user_id: req.user._id
  }).then(tags => {
    res.json(tags);
  }).catch(next);
});

api.get('/notebook', (req, res, next) => {
  req._app.listNotebook({
    company_id: req.company._id,
    user_id: req.user._id
  }).then(notebooks => {
    res.json(notebooks);
  }).catch(next);
});

api.get('/note', (req, res, next) => {
  validate('limit', req.query);
  req._app.note({
    company_id: req.company._id,
    user_id: req.user._id,
    last_id: req.query.last_id,
    sort_type: req.query.sort_type,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/tag/:tag_id/note', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  validate('limit', req.query);
  let { tag_id } = req.params;
  req._app.note({
    company_id: req.company._id,
    user_id: req.user._id,
    last_id: req.query.last_id,
    sort_type: req.query.sort_type,
    tag_id,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/notebook/:notebook_id/note', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  validate('limit', req.query);
  let { notebook_id } = req.params;
  req._app.note({
    company_id: req.company._id,
    user_id: req.user._id,
    last_id: req.query.last_id,
    sort_type: req.query.sort_type,
    notebook_id
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/note/:note_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.noteQuery({
    company_id: req.company._id,
    user_id: req.user._id,
    note_id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/shared/all', (req, res, next) => {
  validate('share', req.query, ['last_id', 'sort_type']);
  req._app.sharedQuery({
    user_id: req.user._id,
    company_id: req.company._id,
    last_id: req.query.last_id,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/shared/member/:member_id', (req, res, next) => {
  validate('share', req.params, ['member_id']);
  validate('share', req.query, ['last_id', 'sort_type']);
  req._app.sharedQuery({
    user_id: req.user._id,
    company_id: req.company._id,
    last_id: req.query.last_id,
    member_id: req.params.member_id,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/note/:note_id/comment', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.commentQuery({
    company_id: req.company._id,
    note_id
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.post('/tag', (req, res, next) => {
  validate('notebook', req.body, ['name']);
  let { name } = req.body;
  req._app.tagAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    name
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/notebook', (req, res, next) => {
  validate('notebook', req.body, ['name']);
  let { name } = req.body;
  req._app.notebookAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    name
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note', (req, res, next) => {
  validate('note', req.body);
  let note = req.body;
  req._app.noteAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    note
  }).then(doc => {
    delete doc.company_id;
    res.json(doc);
  }).catch(next);
});

api.post('/note/:note_id/comment', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('notebook', req.body, ['comment']);
  let { note_id } = req.params;
  let { comment } = req.body;
  req._app.commentAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    note_id,
    content: comment
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note/:note_id/like', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.likeAdd({
    user_id: req.user._id,
    note_id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.delete('/note/:note_id/like', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.likeDelete({
    user_id: req.user._id,
    note_id,
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.delete('/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  let { tag_id } = req.params;
  req._app.tagDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    tag_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.delete('/notebook/:notebook_id', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  let { notebook_id } = req.params;
  req._app.notebookDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    notebook_id,
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.delete('/note/:note_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.noteDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    note_id,
  })
  .then(() => {
    res.json({});
  })
  .catch(next);
});

api.put('/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  validate('notebook', req.body, ['name']);
  let { tag_id } = req.params;
  let { name } = req.body;
  req._app.tagChange({
    user_id: req.user._id,
    company_id: req.company._id,
    name,
    tag_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.put('/notebook/:notebook_id', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  validate('notebook', req.body, ['name']);
  let { notebook_id } = req.params;
  let { name } = req.body;
  req._app.notebookChange({
    user_id: req.user._id,
    company_id: req.company._id,
    name,
    notebook_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.put('/note/:note_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('change', req.body);
  let { note_id } = req.params;
  req._app.noteChange({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    note: req.body
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/note/:note_id/tag', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('notebook', req.body, ['tag_id']);
  let { note_id } = req.params;
  let { tag_id } = req.body;
  req._app.noteAddTag({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    tag_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.delete('/note/:note_id/tag', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('notebook', req.body, ['tag_id']);
  let { note_id } = req.params;
  let { tag_id } = req.body;
  req._app.noteDeleteTag({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    tag_id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/note/:note_id/shared', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('notebook', req.body, ['shared']);
  let { note_id } = req.params;
  let { shared } = req.body;
  req._app.noteShare({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    shared
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/abandoned', (req, res, next) => {
  req._app.abandonList({
    user_id: req.user._id,
    company_id: req.company._id,
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.put('/note/:note_id/abandoned', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  req._app.noteAbandon({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id: req.params.note_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.put('/note/:note_id/recover', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  req._app.noteRecover({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id: req.params.note_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});
