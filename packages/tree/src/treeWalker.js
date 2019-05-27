const MODE = require('./MODE');

module.exports = function treeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
  state.status = state.status || 0;
  state.stack = state.stack || [];
  return (node) => {
    if (state.status & (MODE.FIRST | MODE.NEXT)) {
      state.stack.push(state.node);
    } else if (state.node) { after(state); }
    const prev = state.status & (MODE.LEAF | MODE.LAST);
    if (node) {
      state.node = node;
      state.status = prev ? MODE.NEXT : MODE.FIRST;
      before(state);
    } else {
      state.node = state.stack.pop();
      state.status = state.node ? prev ? MODE.LAST : MODE.LEAF : 0;
    }
    return !!state.node;
  }
}
