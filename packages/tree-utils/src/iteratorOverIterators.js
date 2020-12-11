import { asyncTreeIterator } from '@statewalker/tree/index.js';

export function iteratorOverIterators({ top, context = {}, newIterator, ...options }) {
  const shift = async (context, iterator) => {
    let result, value, done;
    if (iterator) {
      const slot = await iterator.next();
      done = slot.done;
      value = slot.value;
      if (!done) result = newIterator({ value });
    }
    context.value = value;
    context.done = done;
    return result;
  }
  return asyncTreeIterator({
    context,
    ...options,
    async first(context) {
      const { node : iterator } = context;
      if (!iterator) return newIterator({ value : top });
      return shift(context, iterator);
    },
    async next(context) {
      const iterator = context.stack[context.stack.length - 1];
      return shift(context, iterator);
    }
  })
}
