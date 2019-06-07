this.statewalker = this.statewalker || {};
this.statewalker.fsm = (function (tree) {
  'use strict';

  tree = tree && tree.hasOwnProperty('default') ? tree['default'] : tree;

  var FsmConfig_1 = class FsmConfig {

    static buildDescriptor(config) {
      const { transitions = [], states = {}, ...params } = config;
      const indexes = { transitions : {}, states : {} };

      for (let t of transitions) {
        let stateKey, eventKey, targetStateKey, options = {};
        if (Array.isArray(t)) {
          stateKey = t[0]; eventKey = t[1], targetStateKey = t[2];
        } else {
          const { from, event, to, ...opt } = t;
          stateKey = from;
          eventKey = event;
          targetStateKey = to;
          options = opt;
        }
        const stateTransitions = indexes.transitions[stateKey] = indexes.transitions[stateKey] || {};
        stateTransitions[eventKey] = { key : targetStateKey, ...options };
      }
      if (Array.isArray(states)) {
        for (let s of states) {
          indexes.states[s.key] = this.buildDescriptor(s);
        }
      } else if (states) {
        for (let key of Object.keys(states)) {
          indexes.states[key] = this.buildDescriptor(states[key]);
        }
      }
      const descriptor = {...params};
      if (Object.keys(indexes.transitions).length) descriptor.transitions = indexes.transitions;
      if (Object.keys(indexes.states).length) descriptor.states = indexes.states;
      return descriptor;
    }

  };

  var FsmState_1 = class FsmState {

    constructor(options) {
      this.options = options;
      this.parent = this.options.parent;
      this.descriptor = this.options.descriptor;
    }

    get key() { return this.options.stateKey; }


    /**
     * Returns an index of transitions from this state. The resulting object
     * contains event keys with the corresponding path to the target state.
     */
    getTransitions(keepSegments = false) {
      const index = {};
      let state = this;
      while (true) {
        const parentState = state.parent;
        if (!parentState) break;
        const parentPathSegments = parentState.pathSegments;
        const transitions = parentState.descriptor.transitions || {};
        const stateKeys = [this._getKey(state), '*'];
        for (let stateKey of stateKeys) {
          const stateTransitions = transitions[stateKey];
          if (!stateTransitions) continue;
          for (let eventKey of Object.keys(stateTransitions)) {
            if (eventKey in index) continue;
            const targetStateInfo = stateTransitions[eventKey];
            const targetStateKey = this._getKey(targetStateInfo);
            const targetPathSegments = [...parentPathSegments, targetStateKey];
            index[eventKey] = keepSegments
              ? targetPathSegments
              : this._toPath(targetPathSegments);
          }
        }
        state = parentState;
      }
      return index;
    }

    /**
     * Returns an ordered list of all event keys available in this state.
     */
    getEventKeys() {
      const transitions = this.getTransitions();
      return Object.keys(transitions).sort();
    }

    get pathSegments() {
      const list = [];
      let state = this;
      while (state) {
        list.unshift(state.key);
        state = state.parent;
      }
      return list;
    }

    get path() { return this._toPath(this.pathSegments); }

    _toPath(segments = []) { return '/' + segments.join('/') }

    /**
     * Returns the target substate for the specified transition defined
     * by the initial state (which can be null for the initial states) and
     * the tiven event.
     */
    getTargetSubstate(state, event) {
      const stateKey = this._getKey(state);
      const eventKey = this._getKey(event);
      const pairs = [
        [stateKey, eventKey],
        [stateKey, '*'],
        ['*', eventKey],
        ['*', '*']
      ];
      let targetInfo;
      const transitions = this.descriptor.transitions || {};
      for (let [ stateKey, eventKey ] of pairs) {
        const stateTransitions = transitions[stateKey];
        if (!stateTransitions) continue;
        targetInfo = stateTransitions[eventKey];
        if (targetInfo) break;
      }
      return this.newSubstate(targetInfo, event);
    }

    newSubstate(stateInfo) {
      if (!stateInfo) return null;
      const stateKey = stateInfo.key;
      if (!stateKey) return null;
      let parent = this, descriptor;
      while (parent && !descriptor) {
        const substates = parent.descriptor.states || {};
        descriptor = substates[stateKey];
        parent = parent.parent;
      }
      return this._newState(stateKey, descriptor);
    }

    _getKey(n) {
      return n ? n.key || '' : '';
    }

    _newState(stateKey, descriptor) {
      descriptor = descriptor || {};
      return new FsmState({ stateKey, parent : this, descriptor });
    }


  };

  function __asyncGen(g){var q=[],T=["next","throw","return"],I={};for(var i=0;i<3;i++){I[T[i]]=a.bind(0,i);}I[Symbol?Symbol.asyncIterator||(Symbol.asyncIterator=Symbol()):"@@asyncIterator"]=function (){return this};function a(t,v){return new Promise(function(s,j){q.push([s,j,v,t]);q.length===1&&c(v,t);})}function c(v,t){try{var r=g[T[t|0]](v),w=r.value&&r.value.__await;w?Promise.resolve(w).then(c,d):n(r,0);}catch(e){n(e,1);}}function d(e){c(e,1);}function n(r,s){q.shift()[s](r);q.length&&c(q[0][2],q[0][3]);}return I}
  function __asyncIterator(o){var i=o[Symbol&&Symbol.asyncIterator||"@@asyncIterator"]||o[Symbol&&Symbol.iterator||"@@iterator"];if(!i)throw new TypeError("Object is not AsyncIterable.");return i.call(o)}

  const { treeWalker, treeIterator, asyncTreeIterator, MODE } = tree;


  var FsmProcess_1 = class FsmProcess extends FsmState_1 {

    constructor(options) {
      const stateKey = options.stateKey || 'MAIN';
      super({ stateKey, ...options });
      this.mode = this.options.mode || MODE.LEAF;
      this.before = this.options.before;
      this.after = this.options.after;
      this.transition = this.options.transition;
      this.setEvent('');
    }

    setEvent(key = '', options = {}) {
      return this.event = { key, ...options };
    }

    _newWalkerState(params) {
      let current;
      const stack = {
        push : (n) => current = n,
        pop : () => {
          const n = current;
          if (n) { current = n.parent; }
          return n;
        }
      };
      return { stack };
    }

    start(params) {
      const walkerState = this._newWalkerState(params);
      const update = treeWalker({
        state : walkerState,
        before : ({ node : state }) => {
          if (this.before) this.before(state);
        },
        after : ({ stack, node : state }) => {
          if (this.after) this.after(state);
        }
      });
      const run = (...args) => {
        const event = this.setEvent(...args);
        let result = null;
        while (!result) {
          let parent, prev = null, next;
          if (walkerState.status & (MODE.LAST | MODE.LEAF)) {
            prev = walkerState.node;
            parent = prev.parent;
            next = parent ? parent.getTargetSubstate(prev, event) : null;
          } else {
            parent = walkerState.node;
            next = parent ? parent.getTargetSubstate(null, event) : this;
          }
          const node = this._handleTransition({ parent, prev, event, next });
          if (!update(node)) break;
          if (walkerState.status & MODE.LEAF) result = walkerState.node;
        }
        return result;
      };
      run.dump = () => {};
      return run;
    }

    *run() {
      for (let s of treeIterator(this.getIteratorOptions())) {
        yield s.node;
      }
    }

     asyncRun() {return __asyncGen(function*(){
      var $i1,$s1,$e1;try{for ($s1=null,$i1=__asyncIterator( asyncTreeIterator(this.getIteratorOptions()));$s1=yield {__await:$i1.next()},!$s1.done;) {let s=$s1.value;
        yield s.node;
      }}catch(e){$e1=e;}finally{try{!$s1.done&&$i1.return&&(yield {__await:$i1.return()});}finally{if($e1)throw $e1}}
    }.call(this))}

    _handleTransition(options) {
      if (options.next) {
        options.next.process = this;
      }    if (this.transition && (options.prev || options.next)) this.transition(options);
      return options.next;
    }

    getIteratorOptions() {
      return {
        mode : this.mode,
        state : {
          stack : {
            push : (state) => this.state = state,
            pop : () => {
              const state = this.state;
              if (state) { this.state = state.parent; }
              return state;
            }
          }
        },
        first : ({ node : parent }) => {
          const event = this.event;
          const prev = null;
          const next = parent
            ? parent.getTargetSubstate(prev, event)
            : this;
          return this._handleTransition({ parent, prev, event, next });
        },
        next : ({ node : prev }) => {
          const event = this.event;
          const parent = prev.parent;
          const next = parent
            ? parent.getTargetSubstate(prev, event)
            : null;
          return this._handleTransition({ parent, prev, event, next });
        },
        before : ({ node : state }) => {
          if (this.before) this.before(state);
        },
        after : ({ stack, node : state }) => {
          if (this.after) this.after(state);
        }
      }
    }
  };

  var src = {
    FsmConfig : FsmConfig_1,
    FsmState : FsmState_1,
    FsmProcess : FsmProcess_1
  };

  var fsm = src;

  return fsm;

}(this.statewalker.tree));
