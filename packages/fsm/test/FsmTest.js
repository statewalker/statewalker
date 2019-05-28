const expect = require('expect.js');
const { asyncTreeIterator, MODE } = require('@statewalker/tree');
const { FsmStateDescriptor, FsmProcess } = require('../');

const main = {
  key : 'MAIN',
  root : true,
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
  test(`async: should iterate over states and perform required state transitions`, { ...options, method : 'asyncRun' });

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
        descriptor : new FsmStateDescriptor(descriptor),
        before(state) {
          print(state, `<${state.key} event="${process.event.key}">`);
        },
        after(state) {
          print(state, `</${state.key}>`);
        }
      });

      let i = 0;
      let test = [];
      let prevEvent = '';
      for await (let s of process[method]()) {
        test.push(`-[${process.event.key}]->${s.path}`);
        if (i >= events.length) break;
        prevEvent = events[i++];
        print(s, ` [${prevEvent}]`);
        process.setEvent(prevEvent);
      }
      expect(test).to.eql(control);
      expect(testTraces).to.eql(traces);
    })
  }
})
