import expect from 'expect.js';
import { MODE, treeWalker, asyncTreeIterator, treeIterator } from '../src/index.js';


describe('treeWalker', async () => {

  it('should be able to iterate over the tree', async () => {
    let trace = [];
    const stack = [];
    const print = (msg) => {
      trace.push(stack.map(_ => ' ').join('') + msg);
    }
    const update = treeWalker({
      context : { stack },
      before({ node }) {
        print(`<${node}>`);
      },
      after({ node }) {
        print(`</${node}>`);
      }
    });
    expect(await update('a')).to.be(true);
    expect(await update('b1')).to.be(true);
    expect(await update('c1')).to.be(true);
    expect(await update()).to.be(true);
    expect(await update('c2')).to.be(true);
    expect(await update()).to.be(true);
    expect(await update('c3')).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(true);
    expect(await update('b2')).to.be(true);
    expect(await update()).to.be(true);
    expect(await update('b3')).to.be(true);
    expect(await update('d')).to.be(true);
    expect(await update('e')).to.be(true);
    expect(await update('f')).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(true);
    expect(await update()).to.be(false);
    expect(await update()).to.be(false);
    expect(trace).to.eql([
      '<a>',
      ' <b1>',
      '  <c1>',
      '  </c1>',
      '  <c2>',
      '  </c2>',
      '  <c3>',
      '  </c3>',
      ' </b1>',
      ' <b2>',
      ' </b2>',
      ' <b3>',
      '  <d>',
      '   <e>',
      '    <f>',
      '    </f>',
      '   </e>',
      '  </d>',
      ' </b3>',
      '</a>'
    ])
  })

});

const root = {
  name : 'a',
  children : [
    {
      name : 'b1',
      children : [
        { name : 'c1' },
        { name : 'c2' },
        { name : 'c3' }
      ]
    },
    { name : 'b2' },
    {
      name : 'b3',
      children : [{
        name : 'd',
        children : [{
          name : 'e',
          children : [{ name : 'f' }]
        }]
      }]
    }
  ]
};

describe('treeIterator: should be able to iterate over a sync tree', async () => {
  it('#MODE.ENTER', () => test({
    mode : MODE.ENTER,
    root,
    control : ['a', 'b1', 'c1', 'c2', 'c3', 'b2', 'b3', 'd', 'e', 'f'],
    traces : [
      '<a>',
      '[a]',
      '  <b1>',
      '  [b1]',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '  [b3]',
      '    <d>',
      '    [d]',
      '      <e>',
      '      [e]',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }));

  it ('#MODE.LEAF', () => test({
    mode : MODE.LEAF,
    root,
    control : ['c1', 'c2', 'c3', 'b2', 'f'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }));

  it ('#MODE.EXIT', () => test({
    mode : MODE.EXIT,
    root,
    control : ['c1', 'c2', 'c3', 'b1', 'b2', 'f', 'e', 'd', 'b3', 'a'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  [b1]',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      [e]',
      '      </e>',
      '    [d]',
      '    </d>',
      '  [b3]',
      '  </b3>',
      '[a]',
      '</a>'
    ]
  }));

  function newTreeIterator({ root, mode, context, print }) {
    return treeIterator({
      mode,
      context,
      first : ({ node }) => {
        if (!node) return root;
        return (node.children || [])[0];
      },
      next : ({ stack, node }) => {
        const parent = stack[stack.length - 1];
        if (!parent) return null;
        const children = parent.children;
        let idx;
        for (idx = 0; idx < children.length; idx++) {
          if (children[idx].name === node.name) break;
        }
        return children[idx + 1];
      },
      before(context) { print(`<${context.node.name}>`); },
      after(context) { print(`</${context.node.name}>`); }
    });
  }

  function test({ mode, root, control, traces }) {
    const context = { stack : [], status : 0 };
    const trace = [];
    const print = (msg) => {
      const str = context.stack.map(_ => '  ').join('') + msg;
      trace.push(str);
    }
    const it = newTreeIterator({ root, mode, context, print })
    const list = [];
    for (let s of it) {
      const name = s.node.name;
      print(`[${name}]`);
      list.push(name);
    }
    expect(trace).to.eql(traces);
    expect(list).to.eql(control);
  }
})

function newAsyncTreeIterator({ root, mode, context, print }) {
  async function wait(t = 100) { return new Promise(r => setTimeout(r, t))}
  return asyncTreeIterator({
    mode,
    context,
    async first({ node }) {
      await wait(2);
      if (!node) return root;
      return (node.children || [])[0];
    },
    async next({ stack, node }) {
      await wait(2);
      const parent = stack[stack.length - 1];
      if (!parent) return null;
      const children = parent.children;
      let idx;
      for (idx = 0; idx < children.length; idx++) {
        if (children[idx].name === node.name) break;
      }
      return children[idx + 1];
    },
    async before(context) {
      await wait(1);
      print(`<${context.node.name}>`);
    },
    async after(context) {
      await wait(1);
      print(`</${context.node.name}>`);
    }
  });
}

describe('asyncTreeIterator: should be able to iterate over an async tree', async () => {
  it('#MODE.ENTER', () => test({
    mode : MODE.ENTER,
    root,
    control : ['a', 'b1', 'c1', 'c2', 'c3', 'b2', 'b3', 'd', 'e', 'f'],
    traces : [
      '<a>',
      '[a]',
      '  <b1>',
      '  [b1]',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '  [b3]',
      '    <d>',
      '    [d]',
      '      <e>',
      '      [e]',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }));

  it ('#MODE.LEAF', () => test({
    mode : MODE.LEAF,
    root,
    control : ['c1', 'c2', 'c3', 'b2', 'f'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }));

  it ('#MODE.EXIT', () => test({
    mode : MODE.EXIT,
    root,
    control : ['c1', 'c2', 'c3', 'b1', 'b2', 'f', 'e', 'd', 'b3', 'a'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  [b1]',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      [e]',
      '      </e>',
      '    [d]',
      '    </d>',
      '  [b3]',
      '  </b3>',
      '[a]',
      '</a>'
    ]
  }));

  it ('#MODE.ENTER|MODE.EXIT', () => test({
    mode : MODE.ENTER | MODE.EXIT,
    root,
    control : [
    'a',
      'b1',
        'c1', 'c1',
        'c2', 'c2',
        'c3', 'c3',
      'b1',
      'b2', 'b2',
      'b3',
        'd',
          'e',
            'f', 'f',
          'e',
        'd',
      'b3',
    'a'
  ],
    traces : [
      '<a>',
      '[a]',
      '  <b1>',
      '  [b1]',
      '    <c1>',
      '    [c1]',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    [c3]',
      '    </c3>',
      '  [b1]',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '  [b3]',
      '    <d>',
      '    [d]',
      '      <e>',
      '      [e]',
      '        <f>',
      '        [f]',
      '        [f]',
      '        </f>',
      '      [e]',
      '      </e>',
      '    [d]',
      '    </d>',
      '  [b3]',
      '  </b3>',
      '[a]',
      '</a>'
    ]
  }));
  async function test({ mode, nodes, control, traces }) {
    const trace = [];
    const context = { stack : [] };
    const print = (msg) => {
      const str = context.stack.map(_ => '  ').join('') + msg;
      // console.log(str);
      trace.push(str);
    }
    const it = newAsyncTreeIterator({ mode, root, context, print });
    const list = [];
    for await (let s of it) {
      print(`[${s.node.name}]`);
      list.push(s.node.name);
    }
    expect(trace).to.eql(traces);
    expect(list).to.eql(control);
  }
})

describe('asyncTreeIterator: should be able to suspend / resume iterations', async () => {
  it('#MODE.ENTER', async () =>  await test({
    mode : MODE.ENTER,
    root,
    control : ['a', 'b1', 'c1', 'c2', 'c3', 'b2', 'b3', 'd', 'e', 'f'],
    traces : [
      '<a>',
      '[a]',
      '  <b1>',
      '  [b1]',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '  [b3]',
      '    <d>',
      '    [d]',
      '      <e>',
      '      [e]',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }))

  it('#MODE.LEAF', async () => await test({
    mode : MODE.LEAF,
    root,
    control : ['c1', 'c2', 'c3', 'b2', 'f'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      </e>',
      '    </d>',
      '  </b3>',
      '</a>'
    ]
  }));

  it('#MODE.EXIT', async () => await test({
    mode : MODE.EXIT,
    root,
    control : ['c1', 'c2', 'c3', 'b1', 'b2', 'f', 'e', 'd', 'b3', 'a'],
    traces : [
      '<a>',
      '  <b1>',
      '    <c1>',
      '    [c1]',
      '    </c1>',
      '    <c2>',
      '    [c2]',
      '    </c2>',
      '    <c3>',
      '    [c3]',
      '    </c3>',
      '  [b1]',
      '  </b1>',
      '  <b2>',
      '  [b2]',
      '  </b2>',
      '  <b3>',
      '    <d>',
      '      <e>',
      '        <f>',
      '        [f]',
      '        </f>',
      '      [e]',
      '      </e>',
      '    [d]',
      '    </d>',
      '  [b3]',
      '  </b3>',
      '[a]',
      '</a>'
    ]
  }));

  async function test({ mode, nodes, control, traces }) {
    const trace = [];
    let context = { stack : [], status : 0 };
    function print(s) {
      const line = context.stack.map(_ => '  ').join('') + s;
      // console.log(line);
      trace.push(line);
    }
    const list = [];
    let it = newAsyncTreeIterator({ mode, root, context, print });
    const n = Math.round(control.length / 2);
    for await (let s of it) {
      print(`[${s.node.name}]`);
      list.push(s.node.name);
      if (list.length === n) break;
    }

    expect(list.length < control.length).to.be(true);
    expect(list).to.eql(control.slice(0, n));

    // Copy the context to be sure that it is a new object:
    context = JSON.parse(JSON.stringify(context));
    it = newAsyncTreeIterator({ mode, root, context, print });
    for await (let s of it) {
      print(`[${s.node.name}]`);
      list.push(s.node.name);
    }

    expect(list).to.eql(control);
    expect(trace).to.eql(traces);
  }
})

describe(`asyncTreeIterator: should be able to async load tree nodes`, async () => {

  function buildTree(str) {
    const root = 'root';
    const index = {};
    const control = [root];
    const context = { stack : [] };
    const print = (s) => {
      // console.log(context.stack.map(_ => ' ').join(''), s);
    }
    const update = treeWalker({
      context,
      before({ stack, node }){
        const parent = stack[stack.length - 1] || root;
        const list = index[parent] = index[parent] || [];
        list.push(node);
        control.push(node);
        print(`<${node}>`);
      },
      after({ stack, node }){
        print(`</${node}>`);
      }
    })
    let open = true;
    for (let i = 0; i < str.length;) {
      const ch = str[i++];
      if (ch === '(') open = true;
      else {
        if (!open) update(null);
        if (ch !== ')') update(ch);
        open = false;
      }
    }
    while (update(null)) ;
    return { root, index, control };
  }

  it('should iterate over lists', async () => {

    // ABCDEFGHIJKLMNOPQRSTUVWXYZ
    const result = 'abcdefghijklmnopqrstuvwxyz';
    const list = 'a(b(cd(ef(gh(ij(k)))l(mn))op)qrs(tu(v(w)x)y))z';
    const { root, index, control } = buildTree(list);

    const getName = (node) => node.obj;
    const newNode = (obj) => (obj ? { obj, idx : 0 } : null);
    const getChildren = async (n) => index[n] || [];
    const getNextChild = async (node) => {
      if (!node) return null;
      node.childrenPromise = node.childrenPromise || getChildren(node.obj);
      const children = await node.childrenPromise;
      const child = node.idx < children.length ? children[node.idx++] : null;
      return newNode(child);
    }

    const context = { stack : [] };
    const trace = [];
    function print(s) {
      const line = context.stack.map(_ => '  ').join('') + s;
      // const line = context.stack.map(_ => `[${getName(_)}]`).join('/') + ':' + s;
      // console.log(line);
      trace.push(line);
    }

    const first = async ({ node }) => {
      return !node ? await newNode(root) : await getNextChild(node);
    }
    const next = async ({ stack, node, status }) => {
      const parent = stack[stack.length - 1];
      return await getNextChild(parent);
    }
    const before = async (s) => print(`<${getName(s.node)}>`);
    const after = async (s) => print(`</${getName(s.node)}>`);

    let it = asyncTreeIterator({ first, next, before, after, context });
    let i = 0;
    for await (let s of it) {
      print(`[${getName(s.node)}]`);
      expect(getName(s.node)).to.eql(control[i++]);
    }
  })

})
