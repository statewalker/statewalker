const MODE = require('./MODE');

module.exports = function asyncTreeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
  state.status = state.status || 0;
  state.stack = state.stack || [];
  return async (node) => {
    if (state.status & (MODE.FIRST | MODE.NEXT)) {
      await state.stack.push(state.node);
    } else if (state.node) { await after(state); }
    const prev = state.status & (MODE.LEAF | MODE.LAST);
    if (node) {
      state.node = node;
      state.status = prev ? MODE.NEXT : MODE.FIRST;
      await before(state);
    } else {
      state.node = await state.stack.pop();
      state.status = state.node ? prev ? MODE.LAST : MODE.LEAF : 0;
    }
    return !!state.node;
  }
}
