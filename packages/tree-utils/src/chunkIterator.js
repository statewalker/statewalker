const iteratorOverIterators = require('./iteratorOverIterators');

module.exports = function chunkIterator({ top, dump, load, ...options }) {
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

  const state = { stack : [] };
  if (dump) {
    state.status = dump.status;
    state.node = restoreIterator(dump.iterators.pop());
    for (let itr of dump.iterators) {
      state.stack.push(restoreIterator(itr));
    }
  }
  const it = iteratorOverIterators({ top, state, newIterator, ...options });
  it.dump = async () => {
    const dump =  {
      status : state.status,
      iterators : []
    }
    for (let n of state.stack) {
      dump.iterators.push(await dumpIterator(n));
    }
    dump.iterators.push(await dumpIterator(state.node));
    return dump;
  }
  return it;
}
