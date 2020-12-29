import expect from 'expect.js';
import { buildDescriptor, FsmProcess, FsmProcessContext } from '../index.js';
import EventEmitter from 'events';


describe('FsmProcess', async () => {

  const main = {
    key : 'MAIN',
    transitions : [
      ['', '*', 'LOGIN', { key : 'logIn', message: 'Hello, there' }],
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

  describe('Event-based FsmProcessContext', () => {


    function newProcessContext(onNewState) {
      return new FsmProcessContext({ onNewState });
    }

    it(`should iterate over states and perform required state transitions`, async () => {
      const emitter = new EventEmitter();
      const context = newProcessContext((state) => {
        emitter.emit('*', state);
        emitter.emit(state.key, state);
      });

      const descriptor = buildDescriptor(options.descriptor);

      const testTraces = [];
      const print = (state, msg) => {
        let shift = '';
        while (state) {
          state = state.parent;
          shift += '  ';
        }
        testTraces.push(shift + msg);
      }
      emitter.on('*', (state) => {
        const stateKey = state.key;
        state.addHandler({
          before : async () => { print(state, `<${stateKey} event="${state.process.eventKey}">`); },
          after : async() => { print(state, `</${stateKey}>`); }
        });
      })

      const process = context.newProcess({ descriptor });
      const { events, control, traces } = options;
      let i = 0;
      let test = [];
      for await (let s of process.iterate()) {
        test.push(`-[${process.eventKey}]->${s.path}`);
        if (i >= events.length) break;
        const event = events[i++];
        print(s, ` [${event}]`);
        process.setEvent(event);
      }
      expect(test).to.eql(control);
      expect(testTraces).to.eql(traces);
    })

    it(`should be able to dump/restore states at all stages`, async () => {
      const emitter = new EventEmitter();
      const newContext = () => newProcessContext((state) => {
        emitter.emit('*', state);
        emitter.emit(state.key, state);
      });
      let testTraces = [];
      const print = (state, msg) => {
        let shift = '';
        while (state) {
          state = state.parent;
          shift += '  ';
        }
        testTraces.push(shift + msg);
      }
      emitter.on('*', (state) => {
        const stateKey = state.key;
        state.addHandler({
          async before() { print(state, `<${stateKey} event="${state.process.eventKey}">`); },
          async after() { print(state, `</${stateKey}>`); }
        })
        // dump(async (data) => { console.log('>>>', data); })
      })

      const descriptor = buildDescriptor(options.descriptor);
      const { events, control, traces } = options;

      let dumps = [];
      let context = newContext();
      let process = context.newProcess({ descriptor });
      let i = 0;
      for await (let s of process.iterate()) {
        const dump = await process.dump();
        dumps.push(dump);
        process.setEvent(events[i++]);
        if (i >= events.length) break;
      }
      await process.interrupt();

      let test = [];
      i = 0;
      let eventKey = '';
      context = newContext();
      testTraces = [];

      // Performs one step to the first atomic state and interrupts the process.
      // This operation restores the log between two state.
      const goToNextAtomicState = async (process, eventKey) => {
        process.setEvent(eventKey);
        for await (let s of process.iterate()) {
          test.push(`-[${process.eventKey}]->${s.path}`);
          break;
        }
        await process.interrupt();
      }
      // Perform the first step - enter in the first atomic state
      // This operation restores the head of the log
      process = context.newProcess({ descriptor });
      await goToNextAtomicState(process, eventKey);

      for (let dump of dumps) {
        // Recreate process from a dump and make a next step
        let process = context.newProcess({ descriptor });
        await process.restore(dump);
        expect(process.eventKey).to.eql(eventKey);
        eventKey = events[i++];
        print(process.currentState, ` [${eventKey}]`);

        // Make a next step to restore traces from the current state to the next one
        await goToNextAtomicState(process, eventKey);
      }
      expect(test).to.eql(control);
      expect(testTraces).to.eql(traces);

    })
  })

  describe('Basic FsmProcessContext', () => {
    function newContext() {
      const testTraces = [];
      const print = (state, msg) => {
        let shift = '';
        while (state) {
          state = state.parent;
          shift += '  ';
        }
        testTraces.push(shift + msg);
      }
      const context = new FsmProcessContext({
        onNewState(state) {
          state.addHandler({
            before() {
              // throw new Error('Hello')
              print(state, `<${state.key} event="${state.process.eventKey}">`)
            },
            after() {
              print(state, `</${state.key}>`);
            }
          })
          ;
        }
      });
      context.traces = testTraces;
      context.print = print;
      return context;
    }

    it(`should iterate over states and perform required state transitions`, async () => {
      const context = newContext();
      const descriptor = buildDescriptor(options.descriptor);
      const process = context.newProcess({ descriptor });

      const { events, control, traces } = options;
      let i = 0;
      let test = [];
      for await (let s of process.iterate()) {
        test.push(`-[${process.eventKey}]->${s.path}`);
        if (i >= events.length) break;
        const event = events[i++];
        context.print(s, ` [${event}]`);
        process.setEvent(event);
      }
      expect(test).to.eql(control);
      expect(context.traces).to.eql(traces);
    })

    it(`should be able to dump/restore states at all stages`, async () => {
      const { events, control, traces } = options;

      const descriptor = buildDescriptor(options.descriptor);
      let dumps = [];
      let context = newContext();
      let process = context.newProcess({ descriptor });
      let i = 0;
      for await (let s of process.iterate()) {
        const dump = await process.dump();
        dumps.push(dump);
        // console.log('?', JSON.stringify(dump, null, 2));
        // console.log('x', dump);
        process.setEvent(events[i++]);
        if (i >= events.length) break;
      }
      await process.interrupt();

      let test = [];
      i = 0;
      let eventKey = '';
      context = newContext();

      // Performs one step to the first atomic state and interrupts the process.
      // This operation restores the log between two state.
      const goToNextAtomicState = async (process, eventKey) => {
        process.setEvent(eventKey);
        for await (let s of process.iterate()) {
          test.push(`-[${process.eventKey}]->${s.path}`);
          break;
        }
        await process.interrupt();
      }
      // Perform the first step - enter in the first atomic state
      // This operation restores the head of the log
      process = context.newProcess({ descriptor });
      await goToNextAtomicState(process, eventKey);

      for (let dump of dumps) {
        // Recreate process from a dump and make a next step
        let process = context.newProcess({ descriptor });
        await process.restore(dump);
        expect(process.eventKey).to.eql(eventKey);
        eventKey = events[i++];
        context.print(process.currentState, ` [${eventKey}]`);

        // Make a next step to restore traces from the current state to the next one
        await goToNextAtomicState(process, eventKey);
      }
      expect(test).to.eql(control);
      expect(context.traces).to.eql(traces);

    })
  })

})
