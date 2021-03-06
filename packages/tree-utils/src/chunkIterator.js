import { iteratorOverIterators } from './iteratorOverIterators.js';

export function chunkIterator({ top, dump, load, ...options }) {
  const newIterator = ({
      value,
      levelDone = false,
      listIdx = -1,
      idx = -1,
      token
     }) => {
    return {
      value,
      levelDone,
      listIdx,
      idx,
      token,
      nextToken : null,
      async next() {
        if (this.levelDone) return { done : true };
        if (!this.list) {
          const chunk = await load({
            value : this.value,
            token : this.token
          }) || {};
          this.list = chunk.list || [];
          this.nextToken = chunk.nextToken;
          if (this.idx < 0) this.idx = 0;
          if (this.listIdx < 0) this.listIdx = 0;
        }
        if (this.listIdx >= this.list.length) {
          let chunk = this.nextToken ? await load({
            value : this.value,
            token : this.nextToken
          }) || {} : {};
          this.token = this.nextToken;
          this.nextToken = chunk.nextToken;
          this.listIdx = 0;

          this.list = chunk.list || [];
        }
        if (this.listIdx >= this.list.length) {
          this.levelDone = true;
          return { done : true };
        }
        const value = this.list[this.listIdx++];
        this.idx++;
        return { value };
      },
      [Symbol.asyncIterator]() { return this }
    }
  };
  const dumpIterator = async(iterator) => {
    if (!iterator) return null;
    return {
      value : iterator.value,
      levelDone : iterator.levelDone,
      listIdx : iterator.listIdx,
      idx : iterator.idx,
      token : iterator.token
    }
  };
  const restoreIterator = (dump) => dump ? newIterator(dump) : null;

  const context = { stack : [] };
  if (dump) {
    context.status = dump.status;
    context.node = restoreIterator(dump.iterators.pop());
    for (let itr of dump.iterators) {
      context.stack.push(restoreIterator(itr));
    }
  }
  const it = iteratorOverIterators({ top, context, newIterator, ...options });
  it.dump = async () => {
    const dump =  {
      status : context.status,
      iterators : []
    }
    for (let n of context.stack) {
      dump.iterators.push(await dumpIterator(n));
    }
    dump.iterators.push(await dumpIterator(context.node));
    return dump;
  }
  return it;
}
