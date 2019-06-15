const MODE = require('./MODE');
const walker = require('./walker');

module.exports = function asyncTreeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
  const update = walker(state);
  return async (node) => {
    if (state.status & (MODE.LAST | MODE.LEAF )) await after(state);
    update(node);
    if (state.status & (MODE.NEXT | MODE.FIRST)) await before(state);
    return state.status !== 0;
  }
}
