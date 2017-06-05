import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import Base from '../../base';


export default class Notebook extends Base {

  constructor() {
    super();
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
      return new Promise((resolve) => {
        resolve(doc);
      });
    });
  }

  tagQuery({user_id, company_id, tag_id}) {
    return this.collection('note').aggregate([
      { $match: {
        user_id,
        company_id,
        tags: {$in: [tag_id]},
      }},
      {
        $project: {
          title: 1,
          content: 1,
          tags: 1,
          notebook: 1,
          comments: 1,
          totalLikes: { $size: '$likes' },
          isLike: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
  }

  notebookQuery({user_id, company_id, notebook_id}) {
    return this.collection('note').aggregate([
      { $match: {
        user_id,
        company_id,
        notebook: notebook_id
      }},
      {
        $project: {
          title: 1,
          content: 1,
          tags: 1,
          notebook: 1,
          comments: 1,
          totalLikes: { $size: '$likes' },
          isLike: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
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
          totalLikes: { $size: '$likes' },
          isLike: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
  }

  sharedQuery({user_id, company_id}) {
    return this.collection('note').aggregate([
      { $match: {
        user_id,
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
          totalLikes: { $size: '$likes' },
          isLike: { $in: [ user_id, '$likes' ] }
        }
      }
    ]);
  }

  commentsQuery({company_id, note_id}) {
    return this.collection('comment').find({company_id, note_id});
  }

  tagAdd({company_id, user_id, tag_name}) {
    return this.collection('user').update({
      user_id,
      company_id,
    }, {
      $push: { tags: { name: tag_name, _id: ObjectId() } }
    });
  }

  notebookAdd({company_id, user_id, notebook_name}) {
    return this.collection('user').update({
      user_id,
      company_id,
    }, {
      $push: { notebooks: { name: notebook_name, _id: ObjectId()} }
    });
  }

  noteAdd({user_id, company_id, note}) {
    let { title, content, tags, notebook, shared } = note;
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
      create_date: new Date(),
      update_date: new Date(),
    });
  }

  commentAdd({user_id, company_id, comment}) {
    let { note_id, content } = comment;
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
        $addToSet: { comments: doc._id }
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
        tags: { $in: [tag_id]}
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
      $pull: { notebooks: { _id: notebook_id }}
    }).then(() => {
      return this.collection('note').remove({
        user_id,
        company_id,
        notebook: notebook_id
      });
    });
  }

  noteDelete({company_id, user_id, note_id}) {
    return this.collection('note').findOne({company_id, user_id, _id: note_id}).then(doc => {
      return Promise.all([
        this.collection('note').remove({_id: note_id}),
        this.collection('comment').remove({_id:{ $in: doc.comments}})
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

  tagChange({user_id, company_id, tag_name, tag_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
      'tags._id': tag_id
    }, {
      $set: {
        'tags.$.name': tag_name
      }
    });
  }

  notebookChange({user_id, company_id, notebook_name, notebook_id}) {
    return this.collection('user').update({
      user_id,
      company_id,
      'notebooks._id': notebook_id
    }, {
      $set: {
        'notebooks.$.name': notebook_name
      }
    });
  }

  noteChange({user_id, company_id, note}) {
    let { title, content, note_id } = note;
    return this.collection('note').update({
      _id: note_id,
      company_id,
      user_id,
    }, {
      $set: {
        title,
        content,
      }
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
