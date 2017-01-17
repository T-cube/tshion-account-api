import _ from 'underscore';
import db from 'lib/database';

export default class PlanProduct {

  constructor(plan, productsOfSpecificPlan) {
    this.plan = plan;
    this.products = productsOfSpecificPlan;
    this._times = 1;
    this._member_count = 0;
    if (!this.getPlanProduct() || !this.getMemberProduct()) {
      throw new Error('invalid products');
    }
  }

  static init({plan, times, member_count}) {
    let fields = {
      title: 1,
      plan: 1,
      product_no: 1,
      original_price: 1,
      discount: 1,
    };
    return db.payment.product.find({
      plan
    }, fields)
    .then(products => {
      let model = new PlanProduct(plan, products);
      if (times !== undefined) {
        model.setTimes(parseInt(times));
      }
      if (member_count !== undefined) {
        model.setMemberCount(parseInt(member_count));
      }
      return model;
    });
  }

  setTimes(times) {
    this._times = parseInt(times) || 1;
  }

  setMemberCount(member_count) {
    this._member_count = parseInt(member_count) || 0;
  }

  getPlanProduct() {
    let _planProduct = _.find(this.products, p => p.product_no == 'P0001');
    _planProduct.quantity = 1;
    _planProduct.sum = Math.round(_planProduct.original_price * this._times);
    return _planProduct;
  }

  getMemberProduct() {
    let memberProduct = _.find(this.products, p => p.product_no == 'P0002');
    memberProduct.quantity = this._member_count;
    memberProduct.sum = Math.round(memberProduct.original_price * this._member_count * this._times);
    return memberProduct;
  }

  getPlanOriginalFee() {
    return parseInt(this.getPlanProduct().original_price);
  }

  getMemberOriginalFee() {
    return parseInt(this.getMemberProduct().original_price);
  }

  getTotalFee() {
    let _planProduct = this.getPlanProduct();
    let memberProduct = this.getPlanProduct();
    return _planProduct.sum + memberProduct.sum;
  }

  getProducts() {
    let _planProduct = this.getPlanProduct();
    let memberProduct = this.getPlanProduct();
    return [_planProduct, memberProduct];
  }

  diff({plan, member_count}) {
    if (this.plan == plan) {
      this.setMemberCount(this.member_count - member_count);
      return Promise.resolve([this.getMemberProduct()]);
    } else if (member_count == this._member_count) {
      return PlanProduct.init({plan, member_count, times: this._times})
      .then(another => {
        let selfPlanProduct = this.getPlanProduct();
        let selfMemberProduct = this.getMemberProduct();
        let anotherPlanProduct = another.getPlanProduct();
        let anotherMemberProduct = another.getMemberProduct();
        ['sum', 'original_price'].forEach(i => {
          selfPlanProduct[i] = selfPlanProduct[i] - anotherPlanProduct[i];
          selfMemberProduct[i] = selfMemberProduct[i] - anotherMemberProduct[i];
        });
        return [selfPlanProduct, selfMemberProduct];
      });
    } else {
      throw new Error('cann not diff');
    }
  }

}
