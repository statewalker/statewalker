import { FsmStateConfig } from './FsmStateConfig.js';

export class FsmState {

  constructor(config) {
    if (!(config instanceof FsmStateConfig)) throw new Error(`Bad state configuration`);
    this.config = config;
  }

  get key() { return this.config.key; }

  get process() { return this._process; }
  _setProcess(process) { this._process = process; }

  get parent() { return this._parent; }
  _setParentState(parent) { this._parent = parent; }

  get descriptor() { return this.config.descriptor; }

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

  /**
   * Returns an index of transitions from this state. The resulting object
   * contains event keys with the corresponding path to the target state.
   */
  getTransitions(keepSegments = false) {
    const result = {};
    const transitionsIndex = this._getTransitions();
    for (let [eventKey, { parentState, transition } ] of Object.entries(transitionsIndex)) {
      const parentPathSegments = parentState.pathSegments;
      const path = [...parentPathSegments, transition.targetStateKey];
      result[eventKey] = keepSegments ? path : this._toPath(path);
    }
    return result;
  }

  /**
   * Returns an ordered list of all event keys available in this state.
   */
  getEventKeys() {
    const transitionsIndex = this._getTransitions();
    return Object.keys(transitionsIndex).sort();
  }

  /**
   * Returns true if this state accepts an event with the given key.
   */
  acceptsEvent(eventKey) {
    const transitions = this._getTransitions();
    return eventKey in transitions;
  }

  /**
   * Returns an index of all transitions from this state.
   */
  _getTransitions() {
    if (!this._transitionsIndex) {
      const index = this._transitionsIndex = {};
      let state = this;
      for (;;) {
        const parentState = state.parent;
        if (!parentState) break;
        let transitions = parentState.descriptor.getTransitions(state.key);
        for (let transition of Object.values(transitions)) {
          const eventKey = transition.eventKey;
          if (eventKey in index) continue;
          index[eventKey] = { parentState, transition };
        }
        if ('*' in index) break;
        state = parentState;
      }
    }
    return this._transitionsIndex;
  }

  _getKey(n) {
    return n ? n.key || '' : '';
  }

}
