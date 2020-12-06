import { MODE } from './MODE.js';
import { asyncTreeWalker } from './asyncTreeWalker.js';

export function asyncTreeIterator({ first, next, mode = MODE.ENTER, state = {}, ...options }) {
  const update = asyncTreeWalker({ state, ...options });
  let done = false;
  return {
    async next() {
      while (!done) {
        let load = (state.status & (MODE.LAST | MODE.LEAF)) ? next : first;
        const node = await load(state);
        done = !await update(node);
        if (state.status & mode) break;
      }
      return done ? { done } : { value : state };
    },
    [Symbol.asyncIterator]() { return this; }
  }
}
