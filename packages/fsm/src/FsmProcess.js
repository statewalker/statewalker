import { treeWalkerStep, asyncTreeWalkerStep, MODE } from '@statewalker/tree/index.js';
import { toTreeIterator, toAsyncTreeIterator } from '@statewalker/tree/index.js';

import { FsmState } from './FsmState.js';

export class FsmProcess extends FsmState {

  constructor(options) {
    super(options);
    this.mode = this.options.mode || MODE.LEAF
    const noop = () => {};
    this.before = this.options.before || this.before || noop;
    this.after = this.options.after || this.after || noop;
    this.transition = this.options.transition || this.transition || noop;
    this.context = {
      stack : {
        push : (state) => { this.parentState = state; },
        pop : () => {
          const state = this.parentState;
          if (state) { this.parentState = state.parent; }
          return state;
        }
      }
    };
    const runOptions = {
      context : this.context,
      first : ({ node }) => this._nextState({ parent : node, init : this }),
      next : ({ node }) => this._nextState({ parent : node.parent, prev : node }),
      before : ({ node : state }) => this.before(state),
      after : ({ node : state }) => this.after(state)
    };
    this.nextStep = treeWalkerStep(runOptions);
    this.nextAsyncStep = asyncTreeWalkerStep(runOptions);
  }

  get eventKey() { return this._getKey(this.event); }
  get currentState() { return this.context.node; }

  *run() {
    for (let context of toTreeIterator(this.nextStep, this.mode)) {
      yield context.node;
    }
  }

  async* runAsync() {
    for await (let context of toAsyncTreeIterator(this.nextAsyncStep, this.mode)) {
      yield context.node;
    }
  }

  _handleTransition(options) {
    if (options.next) {
      options.next.process = this;
    }
    if (options.prev || options.next) this.transition(options);
    return options.next;
  }

  _newState(parent, stateKey, descriptor) {
    return new FsmState({ stateKey, parent, descriptor });
  }

  /**
   * Returns a state descriptor for the specified transition or null if there
   * is no such a target transitions.
   */
  _getSubstateDescriptor(state, substateKey) {
    let descriptor, implicitDescriptor;
    for (let s = state; s && (!descriptor); s = s.parent) {
      descriptor = s.descriptor.getSubstateDescriptor(substateKey);
      implicitDescriptor = implicitDescriptor || descriptor;
      if (descriptor && descriptor.implicit) descriptor = null;
    }
    descriptor = descriptor || implicitDescriptor;
    return descriptor;
  }

  _nextState({ parent, prev, init }) {
    const event = this.event;
    let next = init, transition;
    if (parent) {
      const eventKey = this._getKey(event);
      const stateKey = this._getKey(prev);
      transition = parent.descriptor.getTransition(stateKey, eventKey);
      const descriptor = transition
        ? this._getSubstateDescriptor(parent, transition.targetStateKey)
        : null;
      next = descriptor
        ? this._newState(parent, transition.targetStateKey, descriptor)
        : null;
    }
    return this._handleTransition({
      parent,
      prev,
      event,
      next,
      transition
    });
  }

}
