module.exports = class FsmState {

  constructor(options) {
    this.options = options;
    this.parent = this.options.parent;
    this.descriptor = this.options.descriptor;
  }

  get key() { return this.descriptor.key; }

  get pathSegments() {
    const list = [];
    let state = this;
    while (state) {
      list.unshift(state.key);
      state = state.parent;
    }
    return list;
  }

  get path() { return '/' + this.pathSegments.join('/'); }

  getTarget(state, event) {
    const targetKey = this.descriptor.getTargetKey(state, event);
    return this.newSubstate(targetKey);
  }

  newSubstate(targetKey) {
    // if (targetKey === undefined || targetKey === null) return null;
    if (!targetKey) return null;
    let parent = this, descriptor;
    while (parent && !descriptor) {
      descriptor = parent.descriptor.getStateDescriptor(targetKey);
      parent = parent.parent;
    }
    return descriptor ? descriptor.newState(this) : null;
  }

}
