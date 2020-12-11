export class FsmTransitionDescriptor {
  constructor({ sourceStateKey, targetStateKey, eventKey, ...options }) {
    this.sourceStateKey = sourceStateKey || '';
    this.targetStateKey = targetStateKey || '';
    this.eventKey = eventKey;
    this.options = options;
  }
}

/**
 * Static builder method transforming configurations to FsmStateDescriptor
 * instances.
 */
export function buildDescriptor(
  config = {},
  newStateDescriptor = (o => new FsmStateDescriptor(o)),
  newTransitionDescriptor = (o => new FsmTransitionDescriptor(o))
) {
  const { transitions = [], states = {}, ...params } = config;
  const indexes = { transitions : {}, states : {}, implicitStates : {} };

  for (let t of transitions) {
    let stateKey, eventKey, targetStateKey, options = {};
    if (Array.isArray(t)) {
      stateKey = t[0];
      eventKey = t[1];
      targetStateKey = t[2];
      options = t[3];
      if (typeof options !== 'object') options = {};
    } else {
      const { from, event, to, ...opt } = t;
      stateKey = from;
      eventKey = event;
      targetStateKey = to;
      options = opt;
    }
    const stateTransitions = indexes.transitions[stateKey] = indexes.transitions[stateKey] || {};
    indexes.implicitStates[stateKey] = (indexes.implicitStates[stateKey] || 0) + 1;
    indexes.implicitStates[targetStateKey] = (indexes.implicitStates[targetStateKey] || 0) + 1;
    stateTransitions[eventKey] = newTransitionDescriptor({
      sourceStateKey : stateKey,
      eventKey,
      targetStateKey,
      ...options
    });
  }
  if (Array.isArray(states)) {
    for (let s of states) {
      indexes.states[s.key] = buildDescriptor(s, newStateDescriptor, newTransitionDescriptor);
    }
  } else if (states) {
    for (let key of Object.keys(states)) {
      indexes.states[key] = buildDescriptor(states[key], newStateDescriptor, newTransitionDescriptor);
    }
  }

  // Add state descriptor for states mentioned in transition tables
  // but not explicitly defined in the 'states' configuration section.
  for (let stateKey of Object.keys(indexes.implicitStates)) {
    if (!stateKey || ('*' === stateKey)) continue;
    if (stateKey in indexes.states) continue;
    indexes.states[stateKey] = buildDescriptor({
      key : stateKey,
      implicit : true
    }, newStateDescriptor, newTransitionDescriptor);
  }

  const descriptorConfig = {...params};
  if (Object.keys(indexes.transitions).length) descriptorConfig.transitions = indexes.transitions;
  if (Object.keys(indexes.states).length) descriptorConfig.states = indexes.states;
  return newStateDescriptor(descriptorConfig);
}


export class FsmStateDescriptor {

  constructor({ key, implicit = false, states = {}, transitions = {}, ...options }) {
    this.options = options;
    this._transitions = transitions;
    this._states = states;
    this._key = key;
    this._implicit = !!implicit;
  }

  /** The key of this state descriptor */
  get key() { return this._key; }

  /**
   * This flag shows if this state descriptor was explicity defined
   * in the parent state.
   */
  get implicit() { return this._implicit; }


  /**
   * Returns a information about a transition from the specified state
   * with the given event. If such a transition is defined then this method
   * returns object with the target state key and transition parameters from
   * the configuration.
   * @param {string} stateKey key of the original state
   * @param {string} eventKey key of the event triggering the transition
   * @return a transition object with the `key` field corresponding to the target
   * state and others optional fields defined in the configuration; it
   * returns `null` if there is no such a transition
   */
  getTransition(stateKey, eventKey) {
    const pairs = [
      [stateKey, eventKey],
      [stateKey, '*'],
      ['*', eventKey],
      ['*', '*']
    ];
    let targetInfo;
    const transitions = this._transitions;
    for (let [ stateKey, eventKey ] of pairs) {
      const stateTransitions = transitions[stateKey];
      if (!stateTransitions) continue;
      targetInfo = stateTransitions[eventKey];
      if (targetInfo) break;
    }
    return targetInfo || null;
    // return targetInfo ? this.getSubstateDescriptor(targetInfo.targetStateKey) : null;
  }

  /**
   * Returns an index of all possible transitions from the state with the given
   * key. The resulting index contains events as keys and the correponding
   * transition objects with the `key` field of the target state
   * and optional transition parameters defined in the configuration.
   * @param {string} stateKey key of the original state
   * @return an index with event keys and the corresponding target state keys.
   */
  getTransitions(stateKey) {
    return Object.assign({}, this._transitions['*'], this._transitions[stateKey]);
  }

  /**
   * Returns a sub-state descriptor for the specified state key or `null` if
   * there is no such a sub-state.
   * @param {string} stateKey key of the state descriptor to return
   * @param {FsmStateDescriptor} descriptor of the state or `null` if there
   * is no such a sub-state
   */
  getSubstateDescriptor(stateKey) {
    return this._states[stateKey];
  }

  /**
   * Returns an ordered list of substate keys.
   */
  getSubstateKeys() {
    return this._substateKeys = this._substateKeys || Object.keys(this._states).sort();
  }

  /**
   * Returns a list of all substate descriptors ordered by their keys.
   * @return {Array<FsmStateDescriptor>} list of substate descriptors
   */
  getSubstateDescriptors() {
    return Object
      .values(this._states)
      .sort((a, b) => a.key  > b.key ? 1 : a.key < b.key ? -1 : 0);
  }


}

FsmStateDescriptor.buildDescriptor = buildDescriptor;
