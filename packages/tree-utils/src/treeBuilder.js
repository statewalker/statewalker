import { treeWalker } from '@statewalker/tree/index.js';

export function treeBuilder({ before, after, context = {}, compare = (a,b)=>a==b }) {
  context.stack = context.stack || [];
  const update = treeWalker({ context, before, after });
  function next(path) {
    const stack = context.stack;
    const stackLen = stack.length;
    const len = Math.min(path.length, stackLen);
    let i;
    for (i = 0; i < len; i++) {
      if (!compare(stack[i], path[i])) break;
    }
    for (let j = i; j <= stackLen; j++) {
      update(null);
    }
    for (; i < path.length; i++) {
      update(path[i]);
    }
  }
  next.end = () => { while(update(null)); }
  return next;
}
