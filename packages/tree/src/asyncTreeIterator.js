import { MODE } from './MODE.js';
import { asyncTreeWalkerStep } from './asyncTreeWalker.js';

export async function* asyncTreeIterator({ first, next, mode, context = {}, ...options }) {
  const nextStep = asyncTreeWalkerStep({ first, next, context, ...options });
  yield* toAsyncTreeIterator(nextStep, mode);
}

export async function* toAsyncTreeIterator(nextStep, mode = MODE.ENTER) {
  while (true) {
    const context = await nextStep();
    if (!context.status) break;
    if (context.status & mode) yield context;
  }
}
