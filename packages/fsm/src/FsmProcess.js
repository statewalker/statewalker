const { treeWalker, treeIterator, asyncTreeIterator, MODE } = require('@statewalker/tree');
const FsmState = require('./FsmState');

module.exports = class FsmProcess extends FsmState {

  constructor(options) {
    const stateKey = options.stateKey || 'MAIN';
    super({ stateKey, ...options });
    this.mode = this.options.mode || MODE.LEAF
    this.before = this.options.before;
    this.after = this.options.after;
    this.transition = this.options.transition;
    this.setEvent('');
  }

  setEvent(key = '', options = {}) {
    return this.event = { key, ...options };
  }

  start(params) {
    const it = this.run(params);
    return (event) => {
      this.setEvent(event);
      for (let state of it) return state;
      return null;
    }
  }

  startAsync(params) {
    const it = this.asyncRun(params);
    return async (event) => {
      this.setEvent(event);
      for await (let state of it) return state;
      return null;
    }
  }

  *run(params) {
    for (let s of treeIterator(this.getIteratorOptions(params))) {
      yield s.node;
    }
  }

  async *runAsync(params) {
    for await (let s of asyncTreeIterator(this.getIteratorOptions(params))) {
      yield s.node;
    }
  }

  _handleTransition(options) {
    if (options.next) {
      options.next.process = this;
    };
    if (this.transition && (options.prev || options.next)) this.transition(options);
    return options.next;
  }

  getIteratorOptions(params) {
    const walkerState = {
      stack : {
        push : (state) => this.currentState = state,
        pop : () => {
          const state = this.currentState;
          if (state) { this.currentState = state.parent; }
          return state;
        }
      }
    };
    return {
      mode : this.mode,
      state : walkerState,
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
      before : ({ node : state }) => {
        if (this.before) this.before(state);
      },
      after : ({ stack, node : state }) => {
        if (this.after) this.after(state);
      }
    }
  }
}