import Promise from 'bluebird';
import db from 'lib/database';
import { ApiError } from 'lib/error';

export default class Notebook {
  constructor(props) {
    this.user_id = props.user_id;
    this.company_id = props.company_id;
  }

  checkOperation(params) {
    let { type, note } = params;
    switch (type) {
      case 'list':
        return this.list();
        break;
      case 'addNotebook':
        return this.addNotebook();
        break;
      case 'addNote':
        return this.addNote(note);
      default:
        throw new ApiError('400', 'invalid_type');
    }
  }

  addNotebook(notebook) {
    return db.app.store.user.update({
      user_id
    })
  }

  addNote(note) {
    // return new Promise(resolve, reject) => {
    //
    // }
    let { title, content, tags, notebook, shared } = note;
    return db.app.store.note.insert({
      company_id: this.company_id,
      user_id: this.user_id,
      title,
      content,
      tags,
      notebook,
      comments: [],
      likes: [],
      shared,
      create_date: new Date(),
      update_date: new Date(),
    })
  }

  shareNote() {
    return new Promise(resolve, reject) => {

    }
  }

  deleteNote() {
    return new Promise(resolve, reject) => {

    }
  }

  commentNote() {
    return new Promise(resolve, reject) => {

    }
  }

  likeNote() {
    return new Promise(resolve, reject) => {

    }
  }
}
