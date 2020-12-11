import expect from 'expect.js';
import { FsmStateDescriptor, buildDescriptor } from '../index.js';

const config = {
  key : 'MAIN',
  foo : 'Foo',
  bar : 'Bar',
  transitions : [
    ['*', '*', 'LOGIN', { message : 'Hello' }],
    ['LOGIN', 'error', 'BAD_LOGIN_VIEW'],
    ['LOGIN', 'ok', 'MAIN_VIEW'],
    ['MAIN_VIEW', '*', 'MAIN_VIEW'],
    ['*', 'byebye', 'END_SCREEN'],
    ['END_SCREEN', '*', '']
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

describe('FsmDescriptors', async () => {

  it(`should build descriptors from configuration`, () => {
    const d = buildDescriptor(config);
    expect(d instanceof FsmStateDescriptor).to.be(true);
  })

  it(`should provide access to configuration options`, () => {
    const d = buildDescriptor(config);
    expect(d.key).to.eql('MAIN');
    expect(d.options).to.eql({ foo : 'Foo', bar : 'Bar' });
  })

  it(`should give access to all substate descriptor`, () => {
    const d = buildDescriptor(config);
    const substateKeys = d.getSubstateKeys();
    const control = ['BAD_LOGIN_VIEW', 'END_SCREEN', 'FORM', 'LOGIN', 'MAIN_VIEW'];
    expect(substateKeys).to.eql(control);

    const list = d.getSubstateDescriptors();
    expect(!!list).to.be(true);
    expect(Array.isArray(list)).to.be(true);
    expect(list.length).to.eql(control.length);
    expect(list.map(s => s.key)).to.eql(control);
    let i = 0;
    expect(list[i++].implicit).to.be(true); // BAD_LOGIN_VIEW
    expect(list[i++].implicit).to.be(true); // END_SCREEN
    expect(list[i++].implicit).to.be(false); // FORM
    expect(list[i++].implicit).to.be(false); // LOGIN
    expect(list[i++].implicit).to.be(false); // MAIN_VIEW
  })

  it(`should provide information about transitions`, () => {
    const d = buildDescriptor(config);
    const transitions = d.getTransitions('LOGIN');
    expect(Object.keys(transitions).sort()).to.eql(['*', 'byebye', 'error', 'ok']);
    expect(transitions['*'].targetStateKey).to.eql('LOGIN');
    expect(transitions['byebye'].targetStateKey).to.eql('END_SCREEN');
    expect(transitions['error'].targetStateKey).to.eql('BAD_LOGIN_VIEW');
    expect(transitions['ok'].targetStateKey).to.eql('MAIN_VIEW');
  })

  it(`should return information about explicitly defined transitions`, () => {
    const d = buildDescriptor(config);
    let t;

    t = d.getTransition('LOGIN', 'ok');
    expect(!!t).to.be(true);
    expect(t.targetStateKey).to.be('MAIN_VIEW');

    t = d.getTransition('LOGIN', 'error');
    expect(!!t).to.be(true);
    expect(t.targetStateKey).to.be('BAD_LOGIN_VIEW');

    t = d.getTransition('LOGIN', 'foobar');
    expect(!!t).to.be(true);
    expect(t.targetStateKey).to.be('LOGIN');
  })

  it(`should return information about implicit ("*") transitions`, () => {
    const d = buildDescriptor(config);
    let t = d.getTransition('LOGIN', 'foobar');
    expect(!!t).to.be(true);
    expect(t.targetStateKey).to.be('LOGIN');
  })


  it(`should provide access to sub-states`, () => {
    const d = buildDescriptor(config);
    const s = d.getSubstateDescriptor('LOGIN');
    expect(!!s).to.be(true);

    const list = s.getSubstateKeys();
    expect(list).to.eql(['FORM']);

  })


})
