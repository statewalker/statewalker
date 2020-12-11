export class FsmState {

  constructor(options) {
    this.options = options;
    this.parent = this.options.parent;
    this.descriptor = this.options.descriptor;
  }

  getPathSegments() { return [...this.pathSegments]; }

  get pathSegments() {
    if (!this._pathSegments) {
      this._pathSegments = [];
      for (let s = this; s; s = s.parent) { this._pathSegments.unshift(s.key); }
    }
    return this._pathSegments;
  }

  get path() { return this._toPath(this.pathSegments); }

  _toPath(segments = []) { return '/' + segments.join('/') }

  get key() { return this.options.stateKey || this.descriptor.key; }


  /**
   * Returns an index of transitions from this state. The resulting object
   * contains event keys with the corresponding path to the target state.
   */
  getTransitions(keepSegments = false) {
    const index = {};
    let state = this;
    for (;;) {
      const parentState = state.parent;
      if (!parentState) break;
      const parentPathSegments = parentState.pathSegments;
      let transitions = parentState.descriptor.getTransitions(state.key);
      for (let [eventKey, target] of Object.entries(transitions)) {
        if (eventKey in index) continue;
        const path = [...parentPathSegments, target.key];
        index[eventKey] = keepSegments ? path : this._toPath(path);
      }
      state = parentState;
    }
    return index;
  }

  /**
   * Returns an index of all transitions from this state.
   */
  _getTransitions() {
    const index = {};
    let state = this;
    for (;;) {
      const parentState = state.parent;
      if (!parentState) break;
      let transitions = parentState.descriptor.getTransitions(state.key);
      // Note: "(index, transitions, index)" done in purpose!
      // We don't want to overload already defined transitions.
      Object.assign(index, transitions, index);
      state = parentState;
    }
    return index;
  }

  /**
   * Returns an ordered list of all event keys available in this state.
   */
  getEventKeys() {
    const transitions = this._getTransitions();
    return Object.keys(transitions).sort();
  }

  _getKey(n) {
    return n ? n.key || '' : '';
  }

}
