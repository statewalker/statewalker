import { MODE } from './MODE.js';
import { walker } from './walker.js';

export function asyncTreeWalker({ context = {}, before = ()=>{}, after = ()=>{} }) {
  const update = walker(context);
  return async function (node) {
    if (context.status & MODE.EXIT) await after(context);
    update(node);
    if (context.status & MODE.ENTER) await before(context);
    return context.status !== MODE.NONE;
  }
}

export function asyncTreeWalkerStep({ first, next, context = {}, ...options }) {
  const update = asyncTreeWalker({ context, ...options });
  first = first || next;
  return async function nextStep() {
    let load = (context.status & MODE.EXIT) ? next : first;
    await update(await load(context));
    return context;
  }
}
