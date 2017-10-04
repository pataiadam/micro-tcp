const { expect } = require('chai');
const Micro = require('../lib');
const micro = new Micro();

let client = null;

before(function(done) {
  const mw = (name, next) => {
    if(!name) return next(new Error('Name is empty'));
    next();
  };
  micro.add('sayHi', mw, async (name, res) => res('Hi ' + name + '!'));
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

  it('should return an error message', async function() {
    await client.sayHi('').catch((err)=>{
      expect(err).to.equal('Name is empty');
    });
  });
});

after((done)=>{
  client.$end();
  done()
});
