import { ObjectId } from 'mongodb';
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

api.get('/tag/:tag_id/note', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  let { tag_id } = req.params;
  req._app.tagQuery({
    company_id: req.company._id,
    user_id: req.user._id,
    tag_id,
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

api.get('/notebook/:notebook_id', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  let { notebook_id } = req.params;
  req._app.notebookQuery({
    company_id: req.company._id,
    user_id: req.user._id,
    notebook_id
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/shared', (req, res, next) => {
  req._app.sharedQuery({
    company_id: req.company._id
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/note/:note_id/comments', (req, res, next) => {
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
  validate('notebook', req.body, ['tag_name']);
  let { tag_name } = req.body;
  req._app.tagAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    tag_name
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/notebook', (req, res, next) => {
  validate('notebook', req.body, ['notebook_name']);
  let { notebook_name } = req.body;
  req._app.notebookAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    notebook_name
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note', (req, res, next) => {
  validate('notebook', req.body, ['note']);
  let { note } = req.body;
  req._app.noteAdd({
    company_id: req.company._id,
    user_id: req.user._id,
    note
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note/:note_id/comments', (req, res, next) => {
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
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.delete('/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  let { tag_id } = req.params;
  req.model('note').tagDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    tag_id
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.delete('/notebook/:notebook_id', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  let { notebook_id } = req.params;
  req._app.notebookDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    notebook_id,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.delete('/note/:note_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  let { note_id } = req.params;
  req._app.noteDelete({
    company_id: req.company._id,
    user_id: req.user._id,
    note_id,
  }).then(list => {
    res.json(list);
  }).catch(next);
});

api.put('/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['tag_id']);
  validate('notebook', req.body, ['tag_name']);
  let { tag_id } = req.params;
  let { tag_name } = req.body;
  req._app.tagChange({
    user_id: req.user._id,
    company_id: req.company._id,
    tag_name,
    tag_id
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/notebook/:notebook_id', (req, res, next) => {
  validate('notebook', req.params, ['notebook_id']);
  validate('notebook', req.body, ['notebook_name']);
  let { notebook_id } = req.params;
  let { notebook_name } = req.body;
  req._app.notebookChange({
    user_id: req.user._id,
    company_id: req.company._id,
    notebook_name,
    notebook_id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/note/:note_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id']);
  validate('notebook', req.body, ['change']);
  let { note_id } = req.params;
  let { note } = req.body;
  req._app.noteChange({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    note
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/note/:note_id/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id', 'tag_id']);
  let { note_id, tag_id } = req.params;
  req._app.noteAddTag({
    user_id: req.user._id,
    company_id: req.company._id,
    note_id,
    tag_id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.delete('/note/:note_id/tag/:tag_id', (req, res, next) => {
  validate('notebook', req.params, ['note_id', 'tag_id']);
  let { note_id, tag_id } = req.params;
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
