import { FsmTransitionDescriptor } from './FsmTransitionDescriptor.js';
import { FsmStateDescriptor } from './FsmStateDescriptor.js';

/**
 * Static builder method transforming configurations to FsmStateDescriptor
 * instances.
 */
export function buildDescriptor(
  config = {},
  newStateDescriptor = (o => new FsmStateDescriptor(o)),
  newTransitionDescriptor = (o => new FsmTransitionDescriptor(o))
) {
  if (config instanceof FsmStateDescriptor) return config;
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
