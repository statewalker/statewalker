import expect from 'expect.js';
import { buildDescriptor, FsmProcess } from '../index.js';

const main = {
  key : 'MAIN',
  transitions : [
    ['', '*', 'LOGIN'],
    ['LOGIN', 'ok', 'MAIN_VIEW'],
    ['MAIN_VIEW', '*', 'MAIN_VIEW'],
    ['MAIN_VIEW', 'logout', 'LOGIN'],
  ],
  states : [
    {
      key : 'LOGIN',
      transitions : [
        ['', '*', 'FORM']
      ]
    },
    {
      key : 'MAIN_VIEW',
      transitions : [
        ['*', '*', 'PAGE_VIEW'],
        ['*', 'logout', ''],
        ['PAGE_VIEW', 'edit', 'PAGE_EDIT'],
        ['PAGE_EDIT', 'ok', 'PAGE_UPDATED_MESSAGE'],
      ],
      states : [
        {
          key : 'PAGE_EDIT',
          transitions : [
            ['', '*', 'FORM']
          ],
        }
      ]
    },

    {
      key : 'FORM',
      transitions : [
        ['', '*', 'SHOW_FORM'],
        ['SHOW_FORM', '*', 'VALIDATE_FORM'],
        ['SHOW_FORM', 'cancel', ' '],
        ['VALIDATE_FORM', 'ok', ''],
        ['VALIDATE_FORM', '*', 'SHOW_FORM_ERRORS'],
        ['SHOW_FORM_ERRORS', '*', 'SHOW_FORM'],
        ['SHOW_FORM_ERRORS', 'cancel', ''],
      ],
    }
  ],
}

describe('Fsm', async () => {

  const options = {
    descriptor : main,
    events : [
      // Login session
      'submit', 'error', 'ok', 'submit', 'ok',
      // Main state
      'tto',
      // Edit
      'edit', 'submit', 'ok',
      // Close the result message
      'ok',
      // Exit from the main view
       'logout'
    ],
    control : [
      '-[]->/MAIN/LOGIN/FORM/SHOW_FORM',
      '-[submit]->/MAIN/LOGIN/FORM/VALIDATE_FORM',
      '-[error]->/MAIN/LOGIN/FORM/SHOW_FORM_ERRORS',
      '-[ok]->/MAIN/LOGIN/FORM/SHOW_FORM',
      '-[submit]->/MAIN/LOGIN/FORM/VALIDATE_FORM',
      '-[ok]->/MAIN/MAIN_VIEW/PAGE_VIEW',
      '-[tto]->/MAIN/MAIN_VIEW/PAGE_VIEW',
      '-[edit]->/MAIN/MAIN_VIEW/PAGE_EDIT/FORM/SHOW_FORM',
      '-[submit]->/MAIN/MAIN_VIEW/PAGE_EDIT/FORM/VALIDATE_FORM',
      '-[ok]->/MAIN/MAIN_VIEW/PAGE_UPDATED_MESSAGE',
      '-[ok]->/MAIN/MAIN_VIEW/PAGE_VIEW',
      '-[logout]->/MAIN/LOGIN/FORM/SHOW_FORM',
    ],
    traces : [
      '  <MAIN event="">',
      '    <LOGIN event="">',
      '      <FORM event="">',
      '        <SHOW_FORM event="">',
      '         [submit]',
      '        </SHOW_FORM>',
      '        <VALIDATE_FORM event="submit">',
      '         [error]',
      '        </VALIDATE_FORM>',
      '        <SHOW_FORM_ERRORS event="error">',
      '         [ok]',
      '        </SHOW_FORM_ERRORS>',
      '        <SHOW_FORM event="ok">',
      '         [submit]',
      '        </SHOW_FORM>',
      '        <VALIDATE_FORM event="submit">',
      '         [ok]',
      '        </VALIDATE_FORM>',
      '      </FORM>',
      '    </LOGIN>',
      '    <MAIN_VIEW event="ok">',
      '      <PAGE_VIEW event="ok">',
      '       [tto]',
      '      </PAGE_VIEW>',
      '      <PAGE_VIEW event="tto">',
      '       [edit]',
      '      </PAGE_VIEW>',
      '      <PAGE_EDIT event="edit">',
      '        <FORM event="edit">',
      '          <SHOW_FORM event="edit">',
      '           [submit]',
      '          </SHOW_FORM>',
      '          <VALIDATE_FORM event="submit">',
      '           [ok]',
      '          </VALIDATE_FORM>',
      '        </FORM>',
      '      </PAGE_EDIT>',
      '      <PAGE_UPDATED_MESSAGE event="ok">',
      '       [ok]',
      '      </PAGE_UPDATED_MESSAGE>',
      '      <PAGE_VIEW event="ok">',
      '       [logout]',
      '      </PAGE_VIEW>',
      '    </MAIN_VIEW>',
      '    <LOGIN event="logout">',
      '      <FORM event="logout">',
      '        <SHOW_FORM event="logout">'
    ]
  }
  test(`sync: should iterate over states and perform required state transitions`, { ...options, method : 'run' });
  test(`async: should iterate over states and perform required state transitions`, { ...options, method : 'runAsync' });

  function test(msg, { descriptor, events, control, traces, method = 'run' }) {
    it(msg, async () => {
      const testTraces = [];
      const print = (state, msg) => {
        let shift = '';
        while (state) {
          state = state.parent;
          shift += '  ';
        }
        testTraces.push(shift + msg);
      }
      const process = new FsmProcess({
        descriptor : buildDescriptor(descriptor),
        before(state) {
          print(state, `<${state.key} event="${process.eventKey}">`);
        },
        after(state) {
          print(state, `</${state.key}>`);
        }
      });

      let i = 0;
      let test = [];
      let prevEvent = '';
      for await (let s of process[method]()) {
        test.push(`-[${process.eventKey}]->${s.path}`);
        if (i >= events.length) break;
        prevEvent = events[i++];
        print(s, ` [${prevEvent}]`);
        process.event = { key : prevEvent };
      }
      expect(test).to.eql(control);
      expect(testTraces).to.eql(traces);
    })
  }


  describe(`test process interruption/continuation`, () => {
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
      async before(state) { this.print(state, `<${state.key} event="${state.process.event ? state.process.event.key : ''}">`); },
      async after(state) { this.print(state, `</${state.key}>`); }
    });

    const stateHandlers = {
      'Wait' : {
        init : (state) => state.process.event = null
      },
      'HandleError' : (state) => printer.print(state, 'ERROR HANDLER')
    };
    const transitionHandlers = {};

    const stateHandler = newProcessHandler(checkProcessHandlers(stateHandlers), printer);
    // const transitionsHandler = newProcessHandler(checkProcessHandlers(stateHandlers), printer);
    const process = new FsmProcess({
      descriptor : buildDescriptor(descriptor),
      before : stateHandler.before,
      after : stateHandler.after,
      transition : ({ prev, event, next }) => {
        const getKey = (s, d='') => s ? s.key : d;
        const getStack = (s, d) => {
          let stack = [];
          while (true) {
            stack.unshift(getKey(s, d));
            if (!s || s.parent) break;
            s = s.parent;
          }
          return stack.join('/');
        }
      },
      type : 'shp'
    });

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
      await run(process, { key : 'select' });
      control.push(
        '  </Wait>',
        '  <Selected event="select">',
        '    <Wait event="">',
        '     step 2'
      );
      expect(printer.stack).to.eql(control);
    })

    it(`the same event triggers an internal transition between sub-states`, async () => {
      await run(process, { key : 'select' });
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
      await run(process, { key : 'reset' });
      control.push(
        '    </Wait>',
        '  </Selected>',
        '  <Wait event="">',
        '   step 5'
      );
      expect(printer.stack).to.eql(control);
    })

    it(`check error handling`, async () => {
      await run(process, { key : 'error' });
      control.push(
        '  </Wait>',
        '  ERROR HANDLER',
        '  <HandleError event="error">',
         '   step 6',
         '  </HandleError>',
         '  <Wait event="">',
         '   step 7'
      );
      expect(printer.stack).to.eql(control);
    })

    it(`check events handling not available in the transition descriptions`, async () => {
      await run(process, { key : 'toto' });
      control.push(
        '  </Wait>',
        '  <Wait event="">',
        '   step 8'
      );
      expect(printer.stack).to.eql(control);
    })

    it(`finalize process`, async () => {
      await run(process, { key : 'exit' });
      control.push(
        '  </Wait>',
        '</Selection>'
      );
      expect(printer.stack).to.eql(control);
    })

    async function run(process, event) {
      process._steps = process._steps || 0;
      let counter = 0;
      process.event = event;
      for await (let s of process.runAsync()) {
        printer.print(s, ` step ${++process._steps}`);
        if (!process.event) break;
        if (counter++ > 100) break; // Just in case of infinite loops...
      }
      let transitions = {};
      for (let s = process.currentState; !!s; s = s.parent) {
        const t = s.getTransitions(true);
        transitions = Object.assign({}, t, transitions);
      }
      // printer.print(process.currentState, process.currentState && transitions);
    }

    function checkProcessHandlers(handlers) {
      function checkProcessHandler(handler) {
        const noop = () => {};
        if (typeof handler === 'object') {
          if (Array.isArray(handler)) {
            return {
              before : (state) => handler[0] && handler[0](state),
              after : (state) => handler[1] && handler[1](state),
            }
          } else {
            return {
              before : (state) => handler.init && handler.init(state),
              after : (state) => handler.done && handler.done(state)
            }
          }
        } else if (typeof handler === 'function') {
          return { before : handler, after : noop }
        } else {
          return { before : noop, after : noop};
        }
      }
      return Object
        .entries(handlers)
        .reduce((index, [key, handler]) => (index[key] = checkProcessHandler(handler), index), {});
    }

    function newProcessHandler(handlers, ...wrappers) {

      function getHandler(method) {
        return async (state) => {
          const handler = handlers[state.key];
          if (!handler) return ;
          try {
            await handler[method](state);
          } catch (err) {
            if (!err.key) err.key = 'error';
            state.process.event = err;
          }
        }
      }
      const list = [{
        before : getHandler('before'),
        after : getHandler('after'),
      }, ...wrappers];

      return {
        before : async (state) => {
          for (let i = 0; i < list.length; i++) {
            list[i].before && (await list[i].before(state));
          }
        },
        after : async (state) => {
          for (let i = list.length - 1; i >= 0; i--) {
            list[i].after && (await list[i].after(state));
          }
        },
      }
    }

  })

})
