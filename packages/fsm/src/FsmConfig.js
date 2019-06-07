module.exports = class FsmConfig {

  static buildDescriptor(config) {
    const { transitions = [], states = {}, ...params } = config;
    const indexes = { transitions : {}, states : {} };

    for (let t of transitions) {
      let stateKey, eventKey, targetStateKey, options = {};
      if (Array.isArray(t)) {
        stateKey = t[0]; eventKey = t[1], targetStateKey = t[2];
      } else {
        const { from, event, to, ...opt } = t;
        stateKey = from;
        eventKey = event;
        targetStateKey = to;
        options = opt;
      }
      const stateTransitions = indexes.transitions[stateKey] = indexes.transitions[stateKey] || {};
      stateTransitions[eventKey] = { key : targetStateKey, ...options };
    }
    if (Array.isArray(states)) {
      for (let s of states) {
        indexes.states[s.key] = this.buildDescriptor(s);
      }
    } else if (states) {
      for (let key of Object.keys(states)) {
        indexes.states[key] = this.buildDescriptor(states[key]);
      }
    }
    const descriptor = {...params};
    if (Object.keys(indexes.transitions).length) descriptor.transitions = indexes.transitions;
    if (Object.keys(indexes.states).length) descriptor.states = indexes.states;
    return descriptor;
  }

};
