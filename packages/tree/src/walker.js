import { MODE } from './MODE.js';

export function walker(context = {}) {
  context.status = context.status || MODE.NONE;
  context.stack = context.stack || [];
  return (node) => {
    if (context.status & MODE.ENTER) {
      context.stack.push(context.node);
    }
    const prev = context.status & MODE.EXIT;
    if (node) {
      context.node = node;
      context.status = prev ? MODE.NEXT : MODE.FIRST;
    } else {
      context.node = context.stack.pop();
      context.status = prev ? MODE.LAST : MODE.LEAF;
    }
    if (!context.node) context.status = MODE.NONE;
    return context;
  }
}
