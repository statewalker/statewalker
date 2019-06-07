this.statewalker = this.statewalker || {};
this.statewalker.tree = this.statewalker.tree || {};
this.statewalker.tree.utils = (function (tree) {
  'use strict';

  tree = tree && tree.hasOwnProperty('default') ? tree['default'] : tree;

  const { treeWalker } = tree;

  var treeBuilder = function treeBuilder({ before, after, state = {}, compare = (a,b)=>a==b }) {
    state.stack = state.stack || [];
    const update = treeWalker({ state, before, after });
    function next(path) {
      const stack = state.stack;
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
    next.end = () => { while(update(null)); };
    return next;
  };

  function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a);}catch(e){j(e);return}r.done?s(r.value):Promise.resolve(r.value).then(c,d);}function d(e){c(e,1);}c();})}

  const { asyncTreeIterator } = tree;

  var iteratorOverIterators = function iteratorOverIterators({ top, state = {}, newIterator, ...options }) {
    const shift = (state, iterator) => __async(function*(){
      let result, value, done;
      if (iterator) {
        const slot = yield iterator.next();
        done = slot.done;
        value = slot.value;
        if (!done) result = newIterator({ value });
      }
      state.value = value;
      state.done = done;
      return result;
    }());
    return asyncTreeIterator({
      state,
      ...options,
      first(state) {return __async(function*(){
        const { node : iterator } = state;
        if (!iterator) return newIterator({ value : top });
        return shift(state, iterator);
      }())},
      next(state) {return __async(function*(){
        const iterator = state.stack[state.stack.length - 1];
        return shift(state, iterator);
      }())}
    })
  };

  var chunkIterator = function chunkIterator({ top, dump, load, ...options }) {
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
        next() {return __async(function*(){
          if (this.levelDone) return { done : true };
          if (!this.list) {
            const chunk = (yield load({
              value : this.value,
              token : this.token
            })) || {};
            this.list = chunk.list || [];
            this.nextToken = chunk.nextToken;
            if (this.idx < 0) this.idx = 0;
            if (this.listIdx < 0) this.listIdx = 0;
          }
          if (this.listIdx >= this.list.length) {
            let chunk = this.nextToken ? (yield load({
              value : this.value,
              token : this.nextToken
            })) || {} : {};
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
        }.call(this))},
        [Symbol.asyncIterator]() { return this }
      }
    };
    const dumpIterator = (iterator) => __async(function*(){
      if (!iterator) return null;
      return {
        value : iterator.value,
        levelDone : iterator.levelDone,
        listIdx : iterator.listIdx,
        idx : iterator.idx,
        token : iterator.token
      }
    }());
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
    it.dump = () => __async(function*(){
      const dump =  {
        status : state.status,
        iterators : []
      };
      for (let n of state.stack) {
        dump.iterators.push(yield dumpIterator(n));
      }
      dump.iterators.push(yield dumpIterator(state.node));
      return dump;
    }());
    return it;
  };

  var src = {
    treeBuilder : treeBuilder,
    iteratorOverIterators : iteratorOverIterators,
    chunkIterator : chunkIterator
  };

  var treeUtils = src;

  return treeUtils;

}(this.statewalker.tree));
