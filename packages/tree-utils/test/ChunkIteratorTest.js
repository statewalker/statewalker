import expect from 'expect.js';
import { chunkIterator, iteratorOverIterators } from '../src/index.js';

describe('ChunkIterator', async () => {

  it(`should iterate over a tree using iterators over subnodes`, async () => {
    return ;
    const top = 'foo';
    const index = {
      [top] : ['A', 'B', 'C', 'D'],
      'B' : ['B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6', 'B-7', 'B-8', 'B-9'],
      'B-5' : ['B-5-1', 'B-5-2', 'B-5-3'],
      'B-5-2' : ['B-5-2-1', 'B-5-2-2', 'B-5-2-3'],
    };
    const it = iteratorOverIterators({
      top,
      newIterator({ value }) {
        return index[value];
      }
    })

    const list = [];
    for await (let item of it) {
      list.push(item);
    }
    expect(list).to.eql([
      [ top ],
      [ ' A' ],
      [ ' B' ],
      [ '  B-1' ],
      [ '  B-2' ],
      [ '  B-3' ],
      [ '  B-4' ],
      [ '  B-5' ],
      [ '   B-5-1' ],
      [ '   B-5-2' ],
      [ '    B-5-2-1' ],
      [ '    B-5-2-2' ],
      [ '    B-5-2-3' ],
      [ '   B-5-3' ],
      [ '  B-6' ],
      [ '  B-7' ],
      [ '  B-8' ],
      [ '  B-9' ],
      [ ' C' ],
      [ ' D' ]
    ])
  })


  it('should iterate over a tree using chunked lists with state dump/restore', async () => {
    const index = {
      'foo' : { list : ['A', 'B', 'C', 'D'] },
      'B' : { list: ['B-1', 'B-2', 'B-3'], nextToken : 'B-one' },
      'B-one' : { list: ['B-4', 'B-5', 'B-6'], nextToken : 'B-two' },
      'B-two' : { list: ['B-7', 'B-8', 'B-9'] },
      'B-5' : { list : ['B-5-1', 'B-5-2', 'B-5-3'] },
      'B-5-2' : { list : ['B-5-2-1', 'B-5-2-2', 'B-5-2-3'] },
    }

    const top = 'foo';
    await test({ index, top, N : 1, control: [
      [ top ],
      [ ' A' ],
      [ ' B' ],
      [ '  B-1' ],
      [ '  B-2' ],
      [ '  B-3' ],
      [ '  B-4' ],
      [ '  B-5' ],
      [ '   B-5-1' ],
      [ '   B-5-2' ],
      [ '    B-5-2-1' ],
      [ '    B-5-2-2' ],
      [ '    B-5-2-3' ],
      [ '   B-5-3' ],
      [ '  B-6' ],
      [ '  B-7' ],
      [ '  B-8' ],
      [ '  B-9' ],
      [ ' C' ],
      [ ' D' ]
    ] });
    await test({ index, top, N : 2, control : [
      [ top, ' A' ],
      [ ' B',  '  B-1' ],
      [ '  B-2', '  B-3' ],
      [ '  B-4', '  B-5' ],
      [ '   B-5-1', '   B-5-2' ],
      [ '    B-5-2-1', '    B-5-2-2' ],
      [ '    B-5-2-3', '   B-5-3' ],
      [ '  B-6', '  B-7'],
      [ '  B-8', '  B-9' ],
      [ ' C', ' D' ]
    ]});
    await test({ index, top, N : 3, control : [
      [ top, ' A', ' B' ],
      [ '  B-1', '  B-2', '  B-3' ],
      [ '  B-4', '  B-5', '   B-5-1' ],
      [ '   B-5-2', '    B-5-2-1', '    B-5-2-2' ],
      [ '    B-5-2-3', '   B-5-3', '  B-6' ],
      [ '  B-7', '  B-8', '  B-9' ],
      [ ' C', ' D' ]
    ]});
    await test({ index, top, N : 4, control : [
      [ top, ' A',  ' B',  '  B-1'  ],
      [ '  B-2', '  B-3',  '  B-4', '  B-5' ],
      [ '   B-5-1', '   B-5-2',  '    B-5-2-1', '    B-5-2-2' ],
      [ '    B-5-2-3', '   B-5-3',  '  B-6', '  B-7' ],
      [ '  B-8', '  B-9', ' C', ' D'  ]
    ]});
    await test({ index, top, N : 5, control : [
      [ top, ' A', ' B', '  B-1', '  B-2' ],
      [ '  B-3', '  B-4', '  B-5', '   B-5-1', '   B-5-2' ],
      [ '    B-5-2-1',
        '    B-5-2-2',
        '    B-5-2-3',
        '   B-5-3',
        '  B-6' ],
      [ '  B-7', '  B-8', '  B-9', ' C', ' D' ]
    ]});

    async function test({ index, top, N, control }) {
      let finished = false;
      const load = async ({ value, token }) => {
        return index[token || value];
      }
      const before = ({ stack, node }) => {
        // console.log(stack.map(_ => ' ').join(''), `<${node.value}>`);
      }
      const after = ({ stack, node }) => {
        // console.log(stack.map(_ => ' ').join(''), `</${node.value}>`);
        finished = node.value === top;
      }
      const options = {
        top,
        before, after,
        load
      }
      let i = 0, iteration = 0;
      let it;
      while (true) {
        let dump = it ? await it.dump() : null;
        const list = [];
        it = await chunkIterator({ dump, ...options });
        for await (let s of it) {
          list.push(s.stack.map(_=>' ').join('') + s.node.value);
          // console.log('- ', s.stack.map(_=>' ').join(''), s.node.value);
          if (((++i) % N) === 0) break;
        }
        if (finished) break;
        expect(list).to.eql(control[iteration++]);
        // console.log(list);
      }
    }
  })

})
