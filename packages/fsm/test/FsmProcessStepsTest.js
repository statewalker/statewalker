import expect from 'expect.js';
import { EventEmitter } from 'events';
import { FsmProcess, FsmProcessRunner } from '../index.js';

describe(`test access to state information`, () => {
  const descriptor = {
  key : 'Selection',
    transitions : [
      ['*', '*', 'NonSelected'],
      ['*', 'select', 'Selected'],
      ['*', 'error', 'HandleError'],
      ['HandleError', '*', ''],
      ['HandleError', 'fixed', 'NonSelected'],
    ],
    states : [
      {
        key : 'Selected',
        transitions : [
          ['', '*', 'UpdateSelection'],
          ['*', 'select', 'UpdateSelection'],
          ['*', 'clear', '']
        ]
      }
    ]
  }
  it(`should be able to interrupt/continue the process`, async () => {
    const events = new EventEmitter();
    const core = new FsmProcessRunner();
    core.registerProcess(descriptor);
    const process = core.startProcess('Selection', events.emit.bind(events));
    expect(process.started).to.be(false);
    expect(process.finished).to.be(false);
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

    events.on('*', ({ key, before, after, state, process }) => {
      before(() => { print(state, `<${key} event="${process.event ? process.event.key : ''}">`); });
      after(() => { print(state, `</${key}>`); });
    })
    events.on('Selected', ({ before, after }) => {
      // next.pause();
      before(() => { throw new Error('Hello'); });
    })
    events.on('NonSelected', ({ before, after }) => {
      // next.pause();
    })

    expect(process.started).to.be(false);
    expect(process.finished).to.be(false);

    await process.setEvent('abc');
    expect(process.started).to.be(true);
    expect(process.finished).to.be(false);
    expect(process.currentState.key).to.eql('NonSelected');
    expect(process.currentState.getEventKeys()).to.eql(['*', 'error', 'select']);
    expect(process.currentState.acceptsEvent('clear')).to.be(false);
    expect(process.currentState.acceptsEvent('error')).to.be(true);
    expect(process.currentState.acceptsEvent('select')).to.be(true);
    expect(process.currentState.acceptsEvent('*')).to.be(true);
    expect(process.currentState.acceptsEvent('foo')).to.be(false);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">'
    ]);

    await process.setEvent('select');
    expect(process.started).to.be(true);
    expect(process.finished).to.be(false);
    expect(process.currentState.key).to.eql('UpdateSelection');
    expect(process.currentState.getEventKeys()).to.eql(['*', 'clear', 'error', 'select']);
    expect(process.currentState.acceptsEvent('clear')).to.be(true);
    expect(process.currentState.acceptsEvent('error')).to.be(true);
    expect(process.currentState.acceptsEvent('select')).to.be(true);
    expect(process.currentState.acceptsEvent('*')).to.be(true);
    expect(process.currentState.acceptsEvent('foo')).to.be(false);
    expect(traces).to.eql([
      '  <Selection event="abc">',
      '    <NonSelected event="abc">',
      '    </NonSelected>',
      '    <Selected event="select">',
      '      <UpdateSelection event="error">'
    ]);

    await process.setEvent('error');
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
