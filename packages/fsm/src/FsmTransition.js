import { FsmEvent } from './FsmEvent.js';

export class FsmTransition extends FsmEvent {

  static newTransitionKey() {
    let id = this._idCounter = (this._idCounter || 0) + 1;
    return `transition-${id}`;
  }

  constructor({ key, ...options }) {
    key = key || FsmTransition.newTransitionKey();
    super(key, options);
  }

  get key() { return this._key || this.toString(); }

  get process() { return this.options.process; }

  get params() { return this.options.params || {} }

  get parentState() { return this.process.currentState; }

  get parentStateKey() { return this._getKey(this.parentState); }

  get parentStatePath() { return this._getStatePath(this.parentState); }

  get prevState() { return this.options.prevState; }

  get prevStateKey() { return this._getKey(this.prevState); }

  get prevStateLabel() { return this._getKey(this.prevState, '•'); }

  get prevStatePath() { return this._getStatePath(this.prevState, '•'); }

  get nextState() { return this.options.nextState; }

  get nextStateKey() { return this._getKey(this.nextState); }

  get nextStateLabel() { return this._getKey(this.nextState, '✕'); }

  get nextStatePath() { return this._getStatePath(this.nextState, '✕'); }

  get event() { return this.process.event; }

  get eventKey() { return this._getKey(this.event); }

  toString() {
    return `${this.parentStatePath}: ${this.prevStateLabel}-[${this.eventKey}]->${this.nextStateLabel}`;
  }

  _getKey(v, def = '') { return v ? v.key || def : def; }

  _getStatePath(state, def = '') {
    if (state) return state.path;
    const parentState = this.parentState;
    const parentStatePath = parentState ? parentState.path : '';
    return `${parentStatePath}/${def}`;
  }

}
