module.exports = class FsmState {

  constructor(options) {
    this.options = options;
    this.parent = this.options.parent;
    this.descriptor = this.options.descriptor;
  }

  get key() { return this.options.stateKey; }


  /**
   * Returns an index of transitions from this state. The resulting object
   * contains event keys with the corresponding path to the target state.
   */
  getTransitions(keepSegments = false) {
    const index = {};
    let state = this;
    while (true) {
      const parentState = state.parent;
      if (!parentState) break;
      const parentPathSegments = parentState.pathSegments;
      const transitions = parentState.descriptor.transitions || {};
      const stateKeys = [this._getKey(state), '*'];
      for (let stateKey of stateKeys) {
        const stateTransitions = transitions[stateKey];
        if (!stateTransitions) continue;
        for (let eventKey of Object.keys(stateTransitions)) {
          if (eventKey in index) continue;
          const targetStateInfo = stateTransitions[eventKey];
          const targetStateKey = this._getKey(targetStateInfo);
          const targetPathSegments = [...parentPathSegments, targetStateKey];
          index[eventKey] = keepSegments
            ? targetPathSegments
            : this._toPath(targetPathSegments);
        }
      }
      state = parentState;
    }
    return index;
  }

  /**
   * Returns an ordered list of all event keys available in this state.
   */
  getEventKeys() {
    const transitions = this.getTransitions();
    return Object.keys(transitions).sort();
  }

  get pathSegments() {
    const list = [];
    let state = this;
    while (state) {
      list.unshift(state.key);
      state = state.parent;
    }
    return list;
  }

  get path() { return this._toPath(this.pathSegments); }

  _toPath(segments = []) { return '/' + segments.join('/') }

  /**
   * Returns the target substate for the specified transition defined
   * by the initial state (which can be null for the initial states) and
   * the tiven event.
   */
  getTargetSubstate(state, event) {
    const stateKey = this._getKey(state);
    const eventKey = this._getKey(event);
    const pairs = [
      [stateKey, eventKey],
      [stateKey, '*'],
      ['*', eventKey],
      ['*', '*']
    ];
    let targetInfo;
    const transitions = this.descriptor.transitions || {};
    for (let [ stateKey, eventKey ] of pairs) {
      const stateTransitions = transitions[stateKey];
      if (!stateTransitions) continue;
      targetInfo = stateTransitions[eventKey];
      if (targetInfo) break;
    }
    return this.newSubstate(targetInfo, event);
  }

  newSubstate(stateInfo) {
    if (!stateInfo) return null;
    const stateKey = stateInfo.key;
    if (!stateKey) return null;
    let parent = this, descriptor;
    while (parent && !descriptor) {
      const substates = parent.descriptor.states || {};
      descriptor = substates[stateKey];
      parent = parent.parent;
    }
    return this._newState(stateKey, descriptor);
  }

  _getKey(n) {
    return n ? n.key || '' : '';
  }

  _newState(stateKey, descriptor) {
    descriptor = descriptor || {};
    return new FsmState({ stateKey, parent : this, descriptor });
  }


}
