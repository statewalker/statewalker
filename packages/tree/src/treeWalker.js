import { MODE } from './MODE.js';
import { walker } from './walker.js';

export function treeWalker({ context = {}, before = ()=>{}, after = ()=>{} }) {
  const update = walker(context);
  return function (node) {
    if (context.status & MODE.EXIT) after(context);
    update(node);
    if (context.status & MODE.ENTER) before(context);
    return context.status !== MODE.NONE;
  }
}

export function treeWalkerStep({ first, next, context = {}, ...options }) {
  const update = treeWalker({ context, ...options });
  first = first || next;
  return function nextStep() {
    let load = (context.status & MODE.EXIT) ? next : first;
    update(load(context));
    return context;
  }
}
