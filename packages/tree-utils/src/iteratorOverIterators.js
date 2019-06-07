const { asyncTreeIterator } = require('@statewalker/tree');

module.exports = function iteratorOverIterators({ top, state = {}, newIterator, ...options }) {
  const shift = async (state, iterator) => {
    let result, value, done;
    if (iterator) {
      const slot = await iterator.next();
      done = slot.done;
      value = slot.value;
      if (!done) result = newIterator({ value });
    }
    state.value = value;
    state.done = done;
    return result;
  }
  return asyncTreeIterator({
    state,
    ...options,
    async first(state) {
      const { node : iterator } = state;
      if (!iterator) return newIterator({ value : top });
      return shift(state, iterator);
    },
    async next(state) {
      const iterator = state.stack[state.stack.length - 1];
      return shift(state, iterator);
    }
  })
}
