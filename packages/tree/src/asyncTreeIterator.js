import { MODE } from './MODE.js';
import { asyncTreeWalker } from './asyncTreeWalker.js';

export async function* asyncTreeIterator({ first, next, mode = MODE.ENTER, state = {}, ...options }) {
  const update = asyncTreeWalker({ state, ...options });
  first = first || next;
  while (true) {
    let load = (state.status & (MODE.LAST | MODE.LEAF)) ? next : first;
    const node = await load(state);
    if (!await update(node)) break;
    if (state.status & mode) yield state;
  }
}
