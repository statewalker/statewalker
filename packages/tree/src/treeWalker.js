import { MODE } from './MODE.js';
import { walker } from './walker.js';

export function treeWalker({ state = {}, before = ()=>{}, after = ()=>{} }) {
  const update = walker(state);
  return function (node) {
    if (state.status & (MODE.LAST | MODE.LEAF )) after(state);
    update(node);
    if (state.status & (MODE.NEXT | MODE.FIRST)) before(state);
    return state.status !== 0;
  }
}
