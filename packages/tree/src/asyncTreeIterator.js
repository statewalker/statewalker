const MODE = require('./MODE');
const asyncTreeWalker = require('./asyncTreeWalker');

module.exports = async function* asyncTreeIterator({ first, next, mode = MODE.ENTER, state = {}, ...options }) {
  const update = asyncTreeWalker({ state, ...options });
  while (true) {
    let load = (state.status & (MODE.LAST | MODE.LEAF)) ? next : first;
    const node = await load(state);
    if (!await update(node)) break;
    if (state.status & mode) yield state;
  }
}
