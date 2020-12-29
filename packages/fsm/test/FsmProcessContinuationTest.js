import expect from 'expect.js';
import { buildDescriptor, FsmProcessContext } from '../index.js';

describe('FsmProcess interruption/continuation', async () => {

  const descriptor = {
    key : 'Selection',
    transitions : [
      ['*', 'exit', ''],
      ['*', '*', 'Wait'],
      ['Wait', 'select', 'Selected'],
      ['*', 'error', 'HandleError'],
      ['HandleError', '*', 'Wait'],
    ],
    states : [
      {
        key : 'HandleError',
        foo: 'Foo',
        bar : 'Bar'
      },
      {
        key : 'Selected',
        transitions : [
          ['', '*', 'Wait'],
          ['Wait', 'select', 'UpdateSelection'],
          ['UpdateSelection', '*', 'Wait']
        ]
      }
    ]
  }

  const printer = ({
    stack : [],
    print(state, ...args) {
      let shift = '';
      for (let i = 0; !!state; state = state.parent, i++) {
        (i > 0) && (shift += '  ');
      }
      const str = [shift, ...args].reduce((s, v) => s + v, '');
      this.stack.push(str);
    },
    async before(state) { this.print(state, `<${state.key} event="${state.process.eventKey}">`); },
    async after(state) { this.print(state, `</${state.key}>`); }
  });

  const stateHandlers = {
    'Wait' : {
      before : (state) => {
        // console.log('WAIT:BEFORE');
        state.process.suspend();
      },
      // init : (state) => {
      //   console.log('WAIT:INIT');
      // },
      // done : (state) => {
      //   console.log('WAIT:DONE');
      // }
    },
    'HandleError' : (state) => {
      printer.print(state, 'ERROR HANDLER');
      state.process.setEvent('');
    }
  };

  const context = new FsmProcessContext({
    onNewState : (state) => {
      const handler = stateHandlers[state.key];
      if (handler) state.addHandler(handler);
      state.addHandler(printer);
    }
  });

  // const transitionsHandler = newProcessHandler(checkProcessHandlers(stateHandlers), printer);
  const process = context.newProcess({ descriptor : buildDescriptor(descriptor) });

  let control = [];
  it(`process starts and runs while event is defined`, async () => {
    await run(process);
    control.push(
      '<Selection event="">',
      '  <Wait event="">',
      '   step 1'
    );
    expect(printer.stack).to.eql(control);
  })

  it(`continue the process and stop at the embedded wait state cleaning events`, async () => {
    await run(process, 'select');
    control.push(
      '  </Wait>',
      '  <Selected event="select">',
      '    <Wait event="">',
      '     step 2'
    );
    expect(printer.stack).to.eql(control);
  })

  it(`the same event triggers an internal transition between sub-states`, async () => {
    await run(process, 'select');
    control.push(
      '    </Wait>',
      '    <UpdateSelection event="select">',
      '     step 3',
      '    </UpdateSelection>',
      '    <Wait event="">',
      '     step 4'
    );
    expect(printer.stack).to.eql(control);
  })

  it(`an event not defined in the sub-state moves the process to the parent state`, async () => {
    await run(process, 'reset');
    control.push(
      '    </Wait>',
      '  </Selected>',
      '  <Wait event="">',
      '   step 5'
    );
    expect(printer.stack).to.eql(control);
  })

  it(`check error handling`, async () => {
    await run(process, 'error');
    control.push(
      '  </Wait>',
      '  ERROR HANDLER',
      '  <HandleError event="">',
       '   step 6',
       '  </HandleError>',
       '  <Wait event="">',
       '   step 7'
    );
    expect(printer.stack).to.eql(control);
  })

  it(`check events handling not available in the transition descriptions`, async () => {
    await run(process, 'toto');
    control.push(
      '  </Wait>',
      '  <Wait event="">',
      '   step 8'
    );
    expect(printer.stack).to.eql(control);
  })
console.log('>>>>>>>>>>>>>>>>>');

  it(`finalize process`, async () => {
    await run(process, 'exit');
    control.push(
      '  </Wait>',
      '</Selection>'
    );
    expect(printer.stack).to.eql(control);
  })

  async function run(process, event) {
    process._steps = process._steps || 0;
    let counter = 0;
    process.setEvent(event);
    for await (let s of process.iterate()) {
      printer.print(s, ` step ${++process._steps}`);
      if (!process.event) break;
      if (counter++ > 20) break; // Just in case of infinite loops...
    }
    let transitions = {};
    for (let s = process.currentState; !!s; s = s.parent) {
      const t = s.getTransitions(true);
      transitions = Object.assign({}, t, transitions);
    }
    // printer.print(process.currentState, process.currentState && transitions);
  }
  //
  // function checkProcessHandlers(handlers) {
  //   function checkProcessHandler(handler) {
  //     const noop = () => {};
  //     if (typeof handler === 'object') {
  //       if (Array.isArray(handler)) {
  //         return {
  //           before : (state) => handler[0] && handler[0](state),
  //           after : (state) => handler[1] && handler[1](state),
  //         }
  //       } else {
  //         return {
  //           before : (state) => handler.init && handler.init(state),
  //           after : (state) => handler.done && handler.done(state)
  //         }
  //       }
  //     } else if (typeof handler === 'function') {
  //       return { before : handler, after : noop }
  //     } else {
  //       return { before : noop, after : noop};
  //     }
  //   }
  //   return Object
  //     .entries(handlers)
  //     .reduce((index, [key, handler]) => (index[key] = checkProcessHandler(handler), index), {});
  // }
  //
  // function newProcessHandler(handlers, ...wrappers) {
  //
  //   function getHandler(method) {
  //     return async (state) => {
  //       const handler = handlers[state.key];
  //       if (!handler) return ;
  //       try {
  //         await handler[method](state);
  //       } catch (err) {
  //         if (!err.key) err.key = 'error';
  //         state.process.setError(err);
  //       }
  //     }
  //   }
  //   const list = [{
  //     before : getHandler('before'),
  //     after : getHandler('after'),
  //   }, ...wrappers];
  //
  //   return {
  //     before : async (state) => {
  //       for (let i = 0; i < list.length; i++) {
  //         list[i].before && (await list[i].before(state));
  //       }
  //     },
  //     after : async (state) => {
  //       for (let i = list.length - 1; i >= 0; i--) {
  //         list[i].after && (await list[i].after(state));
  //       }
  //     },
  //   }
  // }

})
