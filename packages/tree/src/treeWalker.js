const MODE = require('./MODE');
const walker = require('./walker');

module.exports = function treeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
  const update = walker(state);
  return (node) => {
    if (state.status & (MODE.LAST | MODE.LEAF )) after(state);
    update(node);
    if (state.status & (MODE.NEXT | MODE.FIRST)) before(state);
    return state.status !== 0;
  }
}
