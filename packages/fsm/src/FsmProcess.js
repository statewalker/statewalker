import { asyncTreeWalkerStep, toAsyncTreeIterator } from '@statewalker/tree/index.js';
import { treeWalkerStep, toTreeIterator } from '@statewalker/tree/index.js';

import { FsmEvent } from './FsmEvent.js';
import { FsmState } from './FsmState.js';
import { FsmStateConfig } from './FsmStateConfig.js';
import { FsmProcessConfig } from './FsmProcessConfig.js';
import { FsmTransition } from './FsmTransition.js';

export class FsmProcess extends FsmState {

  constructor(config) {
    if (!(config instanceof FsmProcessConfig)) config = new FsmProcessConfig(config);
    super(config);
    if (!(this.config instanceof FsmProcessConfig)) throw new Error(`Bad process configuration type`);
    this.context = {
      stack : {
        push : (state) => { this._started = true; this.parentState = state; },
        pop : () => {
          const state = this.parentState;
          if (state) { this.parentState = state.parent; }
          return state;
        }
      }
    };
    const runOptions = {
      context : this.context,
      first : ({ node }) => node ? this._nextState({ parent : node }) : this,
      next : ({ node }) => this._nextState({ parent : node.parent, prev : node }),
      before : ({ node : state }) => this.config.doBefore(state),
      after : ({ node : state }) => this.config.doAfter(state)
    };
    this.nextStep = treeWalkerStep(runOptions);
    this.nextAsyncStep = asyncTreeWalkerStep(runOptions);
    this._setProcess(this);
  }

  get event() { return this._event; }
  async setEvent(eventKey, options) {
    if (eventKey === null || eventKey === undefined) delete this._event;
    else this._event = new FsmEvent({ key : eventKey, ...options });
    return this.config.onEventUpdate(this);
  }
  get eventKey() { return this.event ? this.event.key : ''; }

  suspend() { this.setEvent(undefined); }

  setError(error) { this.setEvent('error', { error }); }

  setErrors(...errors) { this.setEvent('error', { errors }); }

  get suspended() { return !this._event; }

  get started() { return !!this._started; }

  get finished() { return this.started && !this.context.status; }

  get currentState() { return this.context.node; }

  *run() {
    for (let context of toTreeIterator(this.nextStep, this.config.mode)) {
      yield context.node;
    }
  }

  async* runAsync() {
    for await (let context of toAsyncTreeIterator(this.nextAsyncStep, this.config.mode)) {
      yield context.node;
    }
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

  _nextState({ parent, prev}) {
    if (!parent) return null;
    const event = this.event;
    const eventKey = this._getKey(event);
    const stateKey = this._getKey(prev);
    const transitionDescriptor = parent.descriptor.getTransition(stateKey, eventKey);
    const targetStateKey = transitionDescriptor
      ? transitionDescriptor.targetStateKey
      : null;
    let next = null;
    if (targetStateKey) {
      const descriptor = this._getSubstateDescriptor(parent, targetStateKey);
      if (!descriptor) throw new Error(`Target state descriptor was not found`);
      next = this._newState(parent, targetStateKey, descriptor);
    }
    if (transitionDescriptor) {
      const transition = this._newTransition({
        parent,
        prev,
        next,
        event,
        descriptor : transitionDescriptor
      })
      this.config.onTransition(transition);
    }
    return next;
  }

  _newState(parent, key, descriptor) {
    const config = new FsmStateConfig({ key, descriptor });
    const state = new FsmState(config);
    state._setProcess(this);
    state._setParentState(parent);
    return state;
  }

  _newTransition(options) {
    return new FsmTransition(options);
  }

}
