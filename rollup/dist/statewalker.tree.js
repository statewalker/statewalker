this.statewalker = this.statewalker || {};
this.statewalker.tree = (function () {
  'use strict';

  const MODE = {
    LEAF : 1,
    LAST : 2,
    FIRST : 4,
    NEXT : 8,
  };
  MODE.ENTER = MODE.FIRST | MODE.NEXT;
  MODE.EXIT = MODE.LAST | MODE.LEAF;
  var MODE_1 = MODE;

  var treeWalker = function treeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
    state.status = state.status || 0;
    state.stack = state.stack || [];
    return (node) => {
      if (state.status & (MODE_1.FIRST | MODE_1.NEXT)) {
        state.stack.push(state.node);
      } else if (state.node) { after(state); }
      const prev = state.status & (MODE_1.LEAF | MODE_1.LAST);
      if (node) {
        state.node = node;
        state.status = prev ? MODE_1.NEXT : MODE_1.FIRST;
        before(state);
      } else {
        state.node = state.stack.pop();
        state.status = state.node ? prev ? MODE_1.LAST : MODE_1.LEAF : 0;
      }
      return !!state.node;
    }
  };

  var treeIterator = function* treeIterator({ first, next, mode = MODE_1.ENTER, state = {}, ...options }) {
    const update = treeWalker({ state, ...options });
    first = first || next;
    while (true) {
      let load = (state.status & (MODE_1.LAST | MODE_1.LEAF)) ? next : first;
      const node = load(state);
      if (!update(node)) break;
      if (state.status & mode) yield state;
    }
  };

  function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a);}catch(e){j(e);return}r.done?s(r.value):Promise.resolve(r.value).then(c,d);}function d(e){c(e,1);}c();})}

  var asyncTreeWalker = function asyncTreeWalker({ state = {}, before = (w)=>{}, after = (w)=>{} }) {
    state.status = state.status || 0;
    state.stack = state.stack || [];
    return (node) => __async(function*(){
      if (state.status & (MODE_1.FIRST | MODE_1.NEXT)) {
        yield state.stack.push(state.node);
      } else if (state.node) { yield after(state); }
      const prev = state.status & (MODE_1.LEAF | MODE_1.LAST);
      if (node) {
        state.node = node;
        state.status = prev ? MODE_1.NEXT : MODE_1.FIRST;
        yield before(state);
      } else {
        state.node = yield state.stack.pop();
        state.status = state.node ? prev ? MODE_1.LAST : MODE_1.LEAF : 0;
      }
      return !!state.node;
    }())
  };

  var asyncTreeIterator = function asyncTreeIterator({ first, next, mode = MODE_1.ENTER, state = {}, ...options }) {
    const update = asyncTreeWalker({ state, ...options });
    let done = false;
    return {
      next() {return __async(function*(){
        while (!done) {
          let load = (state.status & (MODE_1.LAST | MODE_1.LEAF)) ? next : first;
          const node = yield load(state);
          done = !(yield update(node));
          if (state.status & mode) break;
        }
        return done ? { done } : { value : state };
      }())},
      [Symbol.asyncIterator]() { return this; }
    }
  };

  var src = {
    MODE : MODE_1,
    treeIterator : treeIterator,
    treeWalker : treeWalker,
    asyncTreeWalker : asyncTreeWalker,
    asyncTreeIterator : asyncTreeIterator,
  };

  var tree = src;

  return tree;

}());
