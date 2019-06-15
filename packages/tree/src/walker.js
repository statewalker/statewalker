const MODE = require('./MODE');

module.exports = function walker(state = {}) {
  state.status = state.status || 0;
  state.stack = state.stack || [];
  return (node) => {
    if (state.status & (MODE.FIRST | MODE.NEXT)) {
      state.stack.push(state.node);
    }
    const prev = state.status & (MODE.LEAF | MODE.LAST);
    if (node) {
      state.node = node;
      state.status = prev ? MODE.NEXT : MODE.FIRST;
    } else {
      state.node = state.stack.pop();
      state.status = state.node ? prev ? MODE.LAST : MODE.LEAF : 0;
    }
    return state;
  }
}
