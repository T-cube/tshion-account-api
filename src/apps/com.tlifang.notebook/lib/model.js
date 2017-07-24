import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import _ from 'underscore';

import { ApiError } from 'lib/error';
import AppBase from 'models/app-base';
import { getUniqName, strToReg } from 'lib/utils';

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
          notebooks: [],
        };
        return this.collection('user').insert(criteria);
      }
      return Promise.all([
        Promise.map(doc.tags, item => {
          return this.collection('note').count({tags: item._id, abandoned: { $ne: true }}).then(count => {
            item.total = count;
            return item;
          });
        }),
        Promise.map(doc.notebooks, item => {
          return this.collection('note').count({notebook: item._id, abandoned: { $ne: true }}).then(count => {
            item.total = count;
            return item;
          });
        })
      ]).then(() => {
        return doc;
      });
    });
  }

  listTag({user_id, company_id}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      if (!doc) {
        let user = {
          user_id,
          company_id,
          tags: [],
          notebooks: [],
        };
        return this.collection('user').insert(user)
        .then(() => {
          return [];
        });
      } else {
        return Promise.map(doc.tags, item => {
          return this.collection('note').count({tags: item._id, abandoned: { $ne: true }}).then(count => {
            item.total = count;
            return item;
          });
        })
        .then(tags => {
          return tags;
        });
      }
    });
  }

  listNotebook({user_id, company_id}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      if (!doc) {
        let user = {
          user_id,
          company_id,
          tags: [],
          notebooks: [],
        };
        return this.collection('user').insert(user)
        .then(() => {
          return [];
        });
      } else {
        return Promise.map(doc.notebooks, item => {
          return this.collection('note').count({notebook: item._id, abandoned: { $ne: true }}).then(count => {
            item.total = count;
            return item;
          });
        })
        .then(notebooks => {
          return notebooks;
        });
      }
    });
  }

  note({user_id, company_id, last_id, sort_type, tag_id, notebook_id, key_word}) {
    let criteria = {
      user_id,
      company_id,
      abandoned: { $ne: true },
    };
    let promise = new Promise((resolve) => {
      resolve();
    });
    if (tag_id) {
      criteria.tags = tag_id;
    }
    if (notebook_id) {
      criteria.notebook = notebook_id;
    }
    if (key_word) {
      criteria['$or'] = [
        {
          title: {
            $regex: strToReg(key_word, 'i')
          },
        },
        {
          content: {
            $regex: strToReg(key_word, 'i')
          },
        },
      ];
      promise = this.collection('user').findOne({
        user_id,
      })
      .then(doc => {
        let tag = _.find(doc.tags, item => item.name == key_word);
        if (tag) {
          criteria['or'].push({
            tags: tag._id
          });
        }
      });
    }
    if (last_id) {
      return promise().then(() => {
        return this.collection('note')
        .find(criteria, {
          _id: 1,
        })
        .sort({[sort_type]: -1})
        .then(list => {
          let id_index = this._getIdIndex(last_id, list);
          let target_list = list.slice(id_index, id_index + 10);
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
      });
    } else {
      return promise().then(() => {
        return this.collection('note')
        .find(criteria, {
          company_id: 0
        })
        .sort({[sort_type]: -1 })
        .limit(10)
        .then(list => {
          return list;
        });
      });
    }
  }

  noteQuery({user_id, company_id, note_id}) {
    return this.collection('note').findOne({
      _id: note_id
    })
    .then(doc => {
      if (!doc.user_id.equals(user_id) && !doc.shared) {
        throw new ApiError(403);
      } else {
        doc.is_like = _.some(doc.likes, item => item.equals(user_id));
        doc.total_likes = doc.likes.length;
        return doc;
      }
    });
  }

  sharedQuery({user_id, company_id, last_id, member_id, sort_type, key_word}) {
    let criteria = {
      company_id,
      shared: true,
      abandoned: { $ne: true },
    };
    if (member_id) {
      criteria.user_id = member_id;
    }
    if (key_word) {
      criteria['$or'] = [
        {
          title: {
            $regex: strToReg(key_word, 'i')
          },
        },
        {
          content: {
            $regex: strToReg(key_word, 'i')
          },
        },
      ];
    }
    if (last_id) {
      return this.collection('note')
      .find(criteria, {
        _id: 1,
      })
      .sort({ [sort_type]: -1 })
      .then(list => {
        let id_index = this._getIdIndex(last_id, list);
        let target_list = list.slice(id_index, id_index + 10);
        return Promise.map(target_list, item => {
          return this.collection('note')
          .findOne({
            _id: item._id,
          })
          .then(doc => {
            doc.total_likes = doc.likes.length;
            doc.is_like = _.some(doc.likes, user => user.equals(user_id));
            return doc;
          });
        })
        .then(data => {
          return data;
        });
      });
    } else {
      return this.collection('note').find(criteria)
      .sort({[sort_type]: -1})
      .limit(10)
      .then(list => {
        _.map(list, item => {
          item.total_likes = item.likes.length;
          item.is_like = _.some(item.likes, user => user.equals(user_id));
          return item;
        });
        return list;
      });
    }
  }

  commentQuery({company_id, note_id}) {
    return this.collection('comment').find({ company_id, note_id }).sort({date_create: -1});
  }

  tagAdd({company_id, user_id, name}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      let tag = _.find(doc.tags, item => {
        if (item.name == name) {
          return item;
        }
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
      let now = new Date();
      let notebook = _.find(doc.notebooks, item => {
        return item.name == name && !item.abandoned;
      });
      if (notebook) {
        let names = _.pluck(doc.notebooks, 'name');
        name = getUniqName(names, name);
      }
      let _id = ObjectId();
      return this.collection('user').update({
        user_id,
        company_id,
      }, {
        $push: { notebooks: { name, _id, date_update: now, abandoned: false } }
      }).then(() => {
        return { name, _id, date_update: now, abandoned: false };
      });
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
    return this.collection('note').find({
      notebook: notebook
    }, {
      title: 1
    }).then(list => {
      let names = [];
      list.forEach(item => {
        names.push(item.title);
      });
      title = getUniqName(names, title);
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
      this.collection('note').update({
        _id: note_id
      }, {
        $push: { comments: doc._id }
      });
      return doc;
    });
  }

  likeAdd({note_id, user_id}) {
    return this.collection('note').update({
      _id: note_id,
      abandoned: { $ne: true },
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
        $pull: { tags: tag_id }
      }, {
        multi: true
      });
    });
  }

  notebookDelete({company_id, user_id, notebook_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
      'notebooks._id': notebook_id
    }, {
      $set: {
        'notebooks.$.abandoned': true
      }
    }).then(() => {
      this.collection('note').count({
        notebook: notebook_id
      }).then(count => {
        if (!count) {
          this.collection('user').update({
            user_id,
            company_id
          }, {
            $pull: {
              notebooks: { _id: notebook_id }
            }
          });
        }
      });
      return this.collection('note').update({
        user_id,
        company_id,
        notebook: notebook_id
      }, {
        $set: { abandoned: true },
      }, {
        multi: true
      });
    });
  }

  noteDelete({company_id, user_id, note_id}) {
    return this.collection('note').findOne({ company_id, user_id, _id: note_id }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_user');
      }
      return Promise.all([
        this.collection('note').remove({ _id: note_id }),
        this.collection('comment').remove({ note_id })
      ])
      .then(() => {
        this.collection('note').count({
          notebook: doc.notebook
        })
        .then(count => {
          if (!count) {
            this.collection('user')
            .update({
              company_id,
              user_id,
            }, {
              $pull: {
                notebooks: { _id: doc.notebook }
              }
            });
          }
        });
        return null;
      });
    });
  }

  commentDelete({company_id, user_id, note_id, comment_id}) {
    return this.collection('comment').findOne({
      _id: comment_id,
      company_id,
      user_id
    }).then(comment => {
      if (!comment) {
        throw new ApiError(400, 'invalid_comment');
      }
      if (!comment.note_id.equals(note_id)) {
        throw new ApiError(400, 'invalid_note');
      }
      return this.collection('comment').remove({
        _id: comment_id
      })
      .then(() => {
        this.collection('note').update({
          _id: note_id
        }, {
          $pull: {
            comments: comment_id
          }
        });
        return {};
      });
    });
  }

  likeDelete({user_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      abandoned: { $ne: true },
    }, {
      $pull: { likes: user_id }
    });
  }

  tagChange({user_id, company_id, name, tag_id}) {
    return this.collection('user').findOne({
      user_id,
      company_id
    }).then(doc => {
      let tag = _.find(doc.tags, tag => tag.name == name);
      if (tag) {
        return Promise.all([
          this.collection('user').update({
            user_id,
            company_id
          }, {
            $pull: {
              tags: { _id: tag_id }
            }
          }),
          this.collection('note').update({
            user_id,
            company_id,
            tags: tag_id
          }, {
            $addToSet: {
              tags: tag._id
            }
          }, {
            multi: true
          }),
        ])
        .then(() => {
          this.collection('note').update({
            user_id,
            company_id,
            tags: tag_id
          }, {
            $pull: {
              tags: tag_id
            }
          }, {
            multi: true
          });
          return tag;
        });
      }
      return this.collection('user').update({
        user_id,
        company_id,
        'tags._id': tag_id
      }, {
        $set: {
          'tags.$.name': name
        }
      }).then(() => {
        return { _id: tag_id, name };
      });
    });
  }

  notebookChange({user_id, company_id, name, notebook_id}) {
    return this.collection('user').findOne({
      user_id,
      company_id,
    })
    .then(doc => {
      let now = new Date();
      let notebook = _.find(doc.notebooks, item => {
        return item.name == name && !item.abandoned;
      });
      if (notebook) {
        let names = _.pluck(doc.notebooks, 'name');
        name = getUniqName(names, name);
      }
      return this.collection('user').update({
        user_id,
        company_id,
        'notebooks._id': notebook_id
      }, {
        $set: {
          'notebooks.$.name': name,
          'notebooks.$.date_update': now
        }
      })
      .then(() => {
        return { id: notebook_id, name, date: now, abandoned: false };
      });
    });
  }

  noteChange({user_id, note_id, company_id, note}) {
    let { title, notebook } = note;
    return this.collection('note').findOne({
      _id: note_id
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(404, 'notebok_not_found');
      }
      if (!notebook) {
        notebook = doc.notebook;
      }
      if (note.title) {
        return this.collection('note').find({
          company_id,
          user_id,
          notebook: notebook,
        }, {
          title: 1,
        })
        .then(list => {
          const names = _.pluck(list, 'title');
          note.title = getUniqName(names, title);
        });
      }
    })
    .then(() => {
      note.date_update = new Date();
      return this.collection('note').update({
        _id: note_id,
        company_id,
        user_id,
        abandoned: { $ne: true },
      }, {
        $set: note
      });
    })
    .then(() => note);
  }

  noteAddTag({company_id, user_id, tag_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
      abandoned: { $ne: true },
    }, {
      $addToSet: { tags: tag_id }
    });
  }

  noteDeleteTag({company_id, user_id, tag_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
      abandoned: { $ne: true },
    }, {
      $pull: { tags: tag_id }
    });
  }

  noteShare({user_id, company_id, note_id, shared}) {
    return this.collection('note').update({
      _id: note_id,
      user_id,
      company_id,
      abandoned: { $ne: true },
    }, {
      $set: {
        shared,
      }
    });
  }

  abandonList({user_id, company_id, last_id, sort_type}) {
    let criteria = {
      user_id,
      company_id,
      abandoned: true
    };
    if (last_id) {
      return this.collection('note')
      .find(criteria, {
        _id: 1,
      })
      .sort({[sort_type]: -1})
      .then(list => {
        let id_index = this._getIdIndex(last_id, list);
        let target_list = list.slice(id_index, id_index + 10);
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

  noteAbandon({user_id, company_id, note_id}) {
    return this.collection('note').update({
      _id: note_id,
      user_id,
      company_id,
    }, {
      $set: {
        abandoned: true
      }
    });
  }

  noteRecover({user_id, company_id, note_id}) {
    return Promise.all([
      this.collection('note').update({
        _id: note_id,
        user_id,
        company_id,
      }, {
        $set: {
          abandoned: false
        }
      }),
      this.collection('note').findOne({
        _id: note_id,
        user_id,
        company_id,
      }),
      this.collection('user').findOne({
        user_id,
        company_id,
      })
    ]).then(([updated, note, user_info]) => {
      if (!note || !user_info || !_.some(user_info.notebooks, item => item._id.equals(note.notebook) && item.abandoned )) {
        return {};
      } else {
        return this.collection('user').update({
          user_id,
          company_id,
          'notebooks._id': note.notebook
        }, {
          $set: {
            'notebooks.$.abandoned': false
          }
        });
      }
    });
  }

  abandonedDelete({user_id, company_id}) {
    return this.collection('note').remove({
      user_id,
      company_id,
      abandoned: true,
    })
    .then(() => {
      this.collection('user').findOne({
        user_id,
        company_id,
      })
      .then(data => {
        data.notebooks.forEach((notebook) => {
          this.collection('note').count({
            user_id,
            company_id,
            notebook: notebook._id
          })
          .then(count => {
            if (!count) {
              this.collection('user').update({
                user_id,
                company_id,
              }, {
                $pull: {
                  notebooks: {
                    _id: notebook._id
                  }
                }
              });
            }
          });
        });
      });
      return;
    });
  }

  _getIdIndex(last_id, list) {
    let id_index;
    for (let i = 0; i < list.length; i++) {
      if (list[i]._id.equals(last_id)) {
        id_index = i + 1;
        break;
      }
      if (i == list.length - 1) {
        if (!id_index) {
          throw new ApiError(400, 'invalid_last_id');
        }
      }
    }
    return id_index;
  }

}

// module.exports=new Notebook();
