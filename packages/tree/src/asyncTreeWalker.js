import { MODE } from './MODE.js';
import { walker } from './walker.js';

export function asyncTreeWalker({ state = {}, before = ()=>{}, after = ()=>{} }) {
  const update = walker(state);
  return async (node) => {
    if (state.status & (MODE.LAST | MODE.LEAF )) await after(state);
    update(node);
    if (state.status & (MODE.NEXT | MODE.FIRST)) await before(state);
    return state.status !== 0;
  }
}
