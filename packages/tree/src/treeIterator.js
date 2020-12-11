import { MODE } from './MODE.js';
import { treeWalkerStep } from './treeWalker.js';

export function* treeIterator({ first, next, mode, context = {}, ...options }) {
  const nextStep = treeWalkerStep({ first, next, context, ...options });
  yield* toTreeIterator(nextStep, mode);
}

export function* toTreeIterator(nextStep, mode = MODE.ENTER) {
  while (true) {
    const context = nextStep();
    if (!context.status) break;
    if (context.status & mode) yield context;
  }
}
