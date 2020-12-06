import { MODE } from './MODE.js';
import { treeWalker } from './treeWalker.js';

export function* treeIterator({ first, next, mode = MODE.ENTER, state = {}, ...options }) {
  const update = treeWalker({ state, ...options });
  first = first || next;
  while (true) {
    let load = (state.status & (MODE.LAST | MODE.LEAF)) ? next : first;
    const node = load(state);
    if (!update(node)) break;
    if (state.status & mode) yield state;
  }
}
