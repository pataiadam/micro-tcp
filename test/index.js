const { expect } = require('chai');
const Micro = require('../lib');

const micro = new Micro();

let client = null;

before(function(done) {
  micro.add('sayHi', async (name, res) => res('Hi ' + name + '!'));
  micro.listen({ port: 56127 }, () => {
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

  it('should return a greeting message', async function() {
    this.timeout(10000);
    const start = new Date().getTime();
    const a = [];
    for (let i=0; i<100000;i++){
      a.push(client.sayHi('Alice'));
    }
    await Promise.all(a)
    console.log(1000 * 200000 / (new Date().getTime() - start));
  });

});
