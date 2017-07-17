import Model from './model';

export default class TransferModel extends Model {
  constructor(props) {
    super(props);
  }


  fetchList(props) {
    let { page, pagesize, criteria = {} } = props;
    return this.db.transfer.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      date_update: -1,
    })
    .then(list => {
      return list;
    });
  }


}
