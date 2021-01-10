import expect from 'expect.js';
import { EventEmitter } from 'events';
import { FsmProcess, FsmProcessRunner } from '../index.js';

describe(`test access to state information`, () => {
  const descriptor = {
  key : 'Selection',
    transitions : [
      ['', '*', 'NonSelected'],
      ['NonSelected', 'select', 'Selected'],
      ['Selected', 'clear', 'NonSelected'],
      ['*', 'error', 'HandleError'],
      ['HandleError', '*', ''],
      ['HandleError', 'fixed', 'NonSelected'],
    ],
    states : [
      {
        key : 'Selected',
        transitions : [
          ['', '*', 'UpdateSelection'],
          ['UpdateSelection', 'select', 'UpdateSelection'],
          ['UpdateSelection', 'clear', '']
        ]
      }
    ]
  }
  it(`should be able to interrupt/continue the process`, async () => {
    const events = new EventEmitter();
    let errors = [];
    const core = new FsmProcessRunner({
      logger : { error(error) { errors.push(error); } },
      onNewState(state) {
        events.emit('*', state);
        events.emit(state.key, state);
      }
    });
    core.registerProcess(descriptor);

    const traces = [];
    const print = (state, ...args) => {
      let shift = '';
      for (let s = state; !!s; s = s.parent) {
        shift += '  ';
      }
      traces.push([shift, ...args].join(''));
    }
    // events.on('tick:begin', (process) => print(process.currentState, 'BEGIN PROCESS STEPS'));
    // events.on('tick:end', (process) => print(process.currentState, 'END PROCESS STEPS'));
    // events.on('tick:pause', (process) => print(process.currentState, 'PROCESS PAUSE'));
    events.on('*', (state) => {
      const stateKey = state.key;
      // console.log('FFFF', stateKey)
      state.addHandler({
        async before() { print(state, `<${stateKey} event="${process.event ? process.event.key : ''}">`); },
        async after() { print(state, `</${stateKey}>`); }
      })
    })
    events.on('Selected', (state) => {
      state.addHandler({
        before() { throw new Error('Hello'); },
      })
    })
    events.on('HandleError', (state) => {
      state.addHandler({
        before() { errors = []; },
      })
    })
    // events.on('NonSelected', (state) => {
    //   // state.process.suspend();
    //   // next.pause();
    // })

    const process = await core.startProcess('Selection');

    expect(process.started).to.be(false);
    expect(process.finished).to.be(false);

    process.setEvent('abc');
    await process.waitWhileRunning();
    expect(errors.length).to.eql(0);
    expect(process.started).to.be(true);
    expect(process.finished).to.be(false);
    expect(process.currentState.key).to.eql('NonSelected');
    expect(process.currentState.getEventKeys()).to.eql(['error', 'select']);
    expect(process.currentState.acceptsEvent('clear')).to.be(false);
    expect(process.currentState.acceptsEvent('error')).to.be(true);
    expect(process.currentState.acceptsEvent('select')).to.be(true);
    expect(process.currentState.acceptsEvent('*')).to.be(false);
    expect(process.currentState.acceptsEvent('foo')).to.be(false);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">'
    ]);

    process.setEvent('select');
    await process.waitWhileRunning();
    expect(errors.length).to.eql(1);
    expect(errors[0].message).to.eql('Hello');
    expect(process.started).to.be(true);
    expect(process.finished).to.be(false);
    expect(process.currentState.key).to.eql('UpdateSelection');
    expect(process.currentState.getEventKeys()).to.eql(['clear', 'error', 'select']);
    expect(process.currentState.acceptsEvent('clear')).to.be(true);
    expect(process.currentState.acceptsEvent('error')).to.be(true);
    expect(process.currentState.acceptsEvent('select')).to.be(true);
    expect(process.currentState.acceptsEvent('*')).to.be(false);
    expect(process.currentState.acceptsEvent('foo')).to.be(false);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">',
      '    </NonSelected>',
      '    <Selected event="select">',
      '      <UpdateSelection event="error">'
    ]);

    await process.setEvent('error');
    await process.waitWhileRunning();
    expect(errors.length).to.eql(0);
    expect(process.started).to.be(true);
    expect(process.finished).to.be(false);
    expect(process.currentState.key).to.eql('HandleError');
    expect(process.currentState.getEventKeys()).to.eql(['*', 'fixed']);
    expect(process.currentState.acceptsEvent('clear')).to.be(false);
    expect(process.currentState.acceptsEvent('error')).to.be(false);
    expect(process.currentState.acceptsEvent('select')).to.be(false);
    expect(process.currentState.acceptsEvent('fixed')).to.be(true);
    expect(process.currentState.acceptsEvent('*')).to.be(true);
    expect(process.currentState.acceptsEvent('foo')).to.be(false);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">',
      '    </NonSelected>',
      '    <Selected event="select">',
      '      <UpdateSelection event="error">',
      '      </UpdateSelection>',
      '    </Selected>',
      '    <HandleError event="error">'
    ]);

    await process.setEvent('exit');
    await process.waitWhileRunning();
    expect(errors.length).to.eql(0);
    expect(process.started).to.be(true);
    expect(process.finished).to.be(true);
    expect(process.currentState).to.be(undefined);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">',
      '    </NonSelected>',
      '    <Selected event="select">',
      '      <UpdateSelection event="error">',
      '      </UpdateSelection>',
      '    </Selected>',
      '    <HandleError event="error">',
      '    </HandleError>',
      '  </Selection>'
    ]);
  })
});
