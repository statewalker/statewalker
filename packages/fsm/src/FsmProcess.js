const { treeIterator, asyncTreeIterator, MODE } = require('@statewalker/tree');
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

  async *asyncRun() {
    for await (let s of asyncTreeIterator(this._getIteratorOptions())) {
      yield s.node;
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
