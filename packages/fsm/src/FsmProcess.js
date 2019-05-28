// const { treeIterator, asyncTreeIterator, MODE } = require('@statewalker/tree/src/treeIterator');
const MODE = require('@statewalker/tree/src/MODE');
const treeIterator = require('@statewalker/tree/src/treeIterator');
const asyncTreeIterator = require('@statewalker/tree/src/asyncTreeIterator');
const FsmState = require('./FsmState');

module.exports = class FsmProcess extends FsmState {

  constructor(options) {
    super(options);
    this.mode = this.options.mode || MODE.LEAF
    this.before = this.options.before;
    this.after = this.options.after;
    this.setEvent('');
  }

  setEvent(key = '', options = {}) {
    this.event = { key, ...options };
  }

  *run() {
    for (let s of treeIterator(this._getIteratorOptions())) {
      yield s.node;
    }
  }

  asyncRun() {
    const it = asyncTreeIterator(this._getIteratorOptions());
    const asyncIterator = Symbol.asyncIterator || Symbol.iterator;
    return {
      async next() {
        const item = await it.next();
        if (item.done) return item;
        return { value : item.value.node };
      },
      [asyncIterator]() { return this; }
    }
  }

  _checkState(state) {
    if (!state) return null;
    state.process = this;
    return state;
  }

  _getIteratorOptions() {
    return {
      mode : this.mode,
      state : {
        stack : {
          push : (state) => this.state = state,
          pop : () => {
            const state = this.state;
            if (state) { this.state = state.parent; }
            return state;
          }
        }
      },
      first : ({ node : parent }) => {
        const nextState = parent
          ? parent.getTarget(null, this.event)
          : this;
        return this._checkState(nextState);
      },
      next : ({ node : state }) => {
        const nextState = state.parent
          ? state.parent.getTarget(state, this.event)
          : null;
        return this._checkState(nextState);
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
