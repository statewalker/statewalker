import { treeIterator, asyncTreeIterator, MODE } from '@statewalker/tree/index.js';
import { FsmState } from './FsmState.js';

export class FsmProcess extends FsmState {

  constructor(options) {
    const stateKey = options.stateKey || 'MAIN';
    super({ stateKey, ...options });
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
  }

  get eventKey() { return this._getKey(this.event); }
  get currentState() { return this.context.node; }

  *run() {
    for (let s of treeIterator(this.getIteratorOptions())) {
      yield s.node;
    }
  }

  async* runAsync() {
    for await (let s of asyncTreeIterator(this.getIteratorOptions())) {
      yield s.node;
    }
  }

  _handleTransition(options) {
    if (options.next) {
      options.next.process = this;
    }
    if (options.prev || options.next) this.transition(options);
    return options.next;
  }

  getIteratorOptions() {
    return {
      mode : this.mode,
      state : this.context,
      first : ({ node : parent }) => {
        const event = this.event;
        const prev = null;
        const next = parent
          ? parent.getTargetSubstate(prev, event)
          : this;
        return this._handleTransition({ parent, prev, event, next });
      },
      next : ({ node : prev }) => {
        const event = this.event;
        const parent = prev.parent;
        const next = parent
          ? parent.getTargetSubstate(prev, event)
          : null;
        return this._handleTransition({ parent, prev, event, next });
      },
      before : ({ node : state }) => this.before(state),
      after : ({ node : state }) => this.after(state)
    }
  }
}
