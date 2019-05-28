const FsmState = require('./FsmState');

module.exports = class FsmStateDescriptor {

  constructor(options) {
    this.options = options;
    this.key = this.options.key;
    this.transitions = {};
    this.states = {};
    const transitions = this.options.transitions || [];
    for (let t of transitions) {
      const transitionKey = this._getTransitionKey(t[0], t[1]);
      this.transitions[transitionKey] = t[2];
    }
    const states = this.options.states || [];
    for (let s of states) {
      this.states[s.key] = this._newDescriptor(s);
    }
  }

  getTargetKey(state, event) {
    const stateKey = this._getKey(state);
    const eventKey = this._getKey(event);
    const pairs = [
      [stateKey, eventKey],
      [stateKey, '*'],
      ['*', eventKey],
      ['*', '*']
    ];
    let targetKey;
    for (let pair of pairs) {
      const transitionKey = this._getTransitionKey(pair[0], pair[1]);
      targetKey = this.transitions[transitionKey];
      if (typeof targetKey === 'string') break;
    }
    return targetKey;
  }

  getStateDescriptor(stateKey) {
    let descriptor = this.states[stateKey];
    if (!descriptor && this.options.root) {
      descriptor = this._newDescriptor({ key : stateKey });
    }
    return descriptor;
  }

  newState(parent) {
    return new FsmState({ parent, descriptor : this });
  }

  _newDescriptor(options) {
    return new FsmStateDescriptor(options);
  }

  _getKey(n) { return n ? n.key : ''; }

  _getTransitionKey(from, event) {
    return `${from}:${event}`
  }
}
