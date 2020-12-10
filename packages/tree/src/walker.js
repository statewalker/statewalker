import { MODE } from './MODE.js';

export function walker(state = {}) {
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
      state.status = prev ? MODE.LAST : MODE.LEAF;
    }
    if (!state.node) state.status = 0;
    return state;
  }
}
