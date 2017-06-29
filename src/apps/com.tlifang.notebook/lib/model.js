import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import _ from 'underscore';
import { ApiError } from 'lib/error';

import AppBase from 'models/app-base';

export default class Notebook extends AppBase {

  constructor(options) {
    super(options);
  }

  list({user_id, company_id}) {
    return this.collection('user').findOne({
      user_id: user_id,
      company_id: company_id,
    }).then(doc => {
      if (!doc) {
        let criteria = {
          user_id: user_id,
          company_id: company_id,
          tags: [],
          notebooks: []
        };
        return this.collection('user').insert(criteria);
      }
      return Promise.all([
        Promise.map(doc.tags, item => {
          return this.collection('note').count({tags: item._id}).then(count => {
            item.total = count;
            return item;
          });
        }),
        Promise.map(doc.notebooks, item => {
          return this.collection('note').count({notebook: item._id}).then(count => {
            item.total = count;
            return item;
          });
        })
      ]).then(() => {
        return doc;
      });
    });
  }

  note({user_id, company_id, last_id, sort_type}) {
    let criteria = {
      user_id,
      company_id,
    };
    if (last_id) {
      return this.collection('note')
      .find(criteria, {
        _id: 1,
      })
      .sort({[sort_type]: -1})
      .then(list => {
        let id_index;
        for (let i = 0; i < list.length; i++) {
          if (list[i]._id.equals(last_id)) {
            id_index = i;
            break;
          }
          if (i == list.length - 1) {
            if (!id_index) {
              throw new ApiError(400, 'invalid_last_id');              
            }
          }
        }
        let target_list = list.splice(id_index, 10);
        return Promise.map(target_list, item => {
          return this.collection('note')
          .findOne({
            _id: item._id
          })
          .then(doc => {
            return doc;
          });
        })
        .then(data => {
          return data;
        });
      });
    } else {
      return this.collection('note')
      .find(criteria, {
        company_id: 0
      })
      .sort({[sort_type]: -1 })
      .limit(10)
      .then(list => {
        return list;
      });
    }
  }

  tagQuery({user_id, company_id, last_id, sort_type, tag_id}) {
    let criteria = {
      user_id,
      company_id,
      tags: tag_id,
    };
    if (last_id) {
      criteria._id = { $lt: last_id };
    }
    return this.collection('note')
    .find(criteria, { company_id: 0 })
    .sort({[sort_type]: -1})
    .limit(10)
    .then(list => {
      return list;
    });
  }

  notebookQuery({user_id, company_id, last_id, sort_type, notebook_id}) {
    let criteria = {
      user_id,
      company_id,
      notebook: notebook_id,
    };
    if (last_id) {
      criteria._id = { $lt: last_id };
    }
    return this.collection('note')
    .find(criteria, { company_id: 0 })
    .sort({[sort_type]: -1})
    .limit(10)
    .then(list => {
      return list;
    });
  }

  noteQuery({user_id, company_id, note_id}) {
    return this.collection('note').aggregate([
      { $match: {
        user_id,
        company_id,
        _id: note_id,
      }},
      {
        $project: {
          title: 1,
          content: 1,
          tags: 1,
          notebook: 1,
          comments: 1,
          total_likes: { $size: '$likes' },
          is_like: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
  }

  sharedQuery({user_id, company_id}) {
    return this.collection('note').aggregate([
      { $match: {
        company_id,
        shared: true
      }},
      {
        $project: {
          title: 1,
          content: 1,
          tags: 1,
          notebook: 1,
          comments: 1,
          total_likes: { $size: '$likes' },
          is_like: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
  }

  commentsQuery({company_id, note_id}) {
    return this.collection('comment').find({ company_id, note_id });
  }

  tagAdd({company_id, user_id, name}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      let tag = _.find(doc.tags, item => {
        return item.name == name;
      });
      if (tag) {
        return tag;
      } else {
        let _id = ObjectId();
        return this.collection('user').update({
          user_id,
          company_id,
        }, {
          $push: { tags: { name, _id } }
        }).then(() => {
          return { name, _id };
        });
      }
    });
  }

  notebookAdd({company_id, user_id, name}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      let notebook = _.find(doc.notebooks, item => {
        return item.name == name;
      });
      if (notebook) {
        return notebook;
      } else {
        let _id = ObjectId();
        return this.collection('user').update({
          user_id,
          company_id,
        }, {
          $push: { notebooks: { name, _id, date_update: new Date() } }
        }).then(() => {
          return { name, _id };
        });
      }
    });
  }

  noteAdd({user_id, company_id, note}) {
    let { title, content, tags, notebook, shared } = note;
    this.collection('user').update({
      user_id,
      company_id,
      'notebooks._id': notebook
    }, {
      $set: {
        'notebooks.$.date_update': new Date()
      }
    });
    return this.collection('note').insert({
      company_id,
      user_id,
      title,
      content,
      tags,
      notebook,
      comments: [],
      likes: [],
      shared,
      date_create: new Date(),
      date_update: new Date(),
    });
  }

  commentAdd({user_id, company_id, note_id, content}) {
    return this.collection('comment').insert({
      user_id,
      company_id,
      note_id,
      content,
      date_create: new Date(),
    }).then(doc => {
      return this.collection('note').update({
        _id: note_id
      }, {
        $push: { comments: doc._id }
      });
    });
  }

  likeAdd({note_id, user_id}) {
    return this.collection('note').update({
      _id: note_id
    }, {
      $addToSet: { likes: user_id }
    });
  }

  tagDelete({user_id, company_id, tag_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
    }, {
      $pull: { tags: { _id: tag_id } }
    }).then(() => {
      return this.collection('note').update({
        user_id,
        company_id,
        tags: tag_id
      }, {
        $pull: { tags: { _id: tag_id }}
      });
    });
  }

  notebookDelete({company_id, user_id, notebook_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
    }, {
      $pull: { notebooks: { _id: notebook_id } }
    }).then(() => {
      return this.collection('note').remove({
        user_id,
        company_id,
        notebook: notebook_id
      });
    });
  }

  noteDelete({company_id, user_id, note_id}) {
    return this.collection('note').findOne({ company_id, user_id, _id: note_id }).then(doc => {
      return Promise.all([
        this.collection('note').remove({ _id: note_id }),
        this.collection('comment').remove({ _id: { $in: doc.comments } })
      ]);
    });
  }

  likeDelete({user_id, note_id}) {
    return this.collection('note').update({
      _id: note_id
    }, {
      $pull: { likes: user_id }
    });
  }

  tagChange({user_id, company_id, name, tag_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
      'tags._id': tag_id
    }, {
      $set: {
        'tags.$.name': name
      }
    });
  }

  notebookChange({user_id, company_id, name, notebook_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
      'notebooks._id': notebook_id
    }, {
      $set: {
        'notebooks.$.name': name,
        'notebooks.$.date_update': new Date()
      }
    });
  }

  noteChange({user_id, note_id, company_id, note}) {
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
    }, {
      $set: note
    });
  }

  noteAddTag({company_id, user_id, tag_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
    }, {
      $addToSet: { tags: tag_id }
    });
  }

  noteDeleteTag({company_id, user_id, tag_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
    }, {
      $pull: { tags: tag_id }
    });
  }

  noteShare({user_id, company_id, note_id, shared}) {
    return this.collection('note').update({
      _id: note_id,
      user_id,
      company_id,
    }, {
      $set: {
        shared,
      }
    });
  }

}

// module.exports=new Notebook();
