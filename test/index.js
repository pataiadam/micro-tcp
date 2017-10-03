const { expect } = require('chai');
const micro = require('../lib');

let client = null;

before(function(done) {
  micro.add('sayHi', async (name, res) => res('Hi ' + name + '!'));
  micro.listen({ port: 56127 }, ()=>{
    micro.createClient({ port: 56127 }, (c) => {
      client = c;
      done();
    })
  })
});

describe('Basic test', () => {
  it('should return a greeting message', async function() {
    const result = await client.sayHi('Alice');
    expect(result).to.equal('Hi Alice!');
  });
});
