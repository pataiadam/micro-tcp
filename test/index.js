const { expect } = require('chai');
const Micro = require('../lib');
const micro = new Micro();

let client = null;

before(async () => {
  const mw = (name) => {
    if(!name) return new Error('Name is empty');
  };
  micro.add('say.hi', mw, async (name) => 'Hi ' + name + '!');
  await micro.listen({ port: 56127 });
  client = await micro.createClient({ port: 56127 });
});

describe('Basic test', () => {
  it('should return a greeting message', async function() {
    const result = await client.say.hi('Alice');
    expect(result).to.equal('Hi Alice!');
  });

  it('should return an error message', async function() {
    await client.say.hi('').catch((err)=>{
      expect(err).to.equal('Name is empty');
    });
  });
});

after((done)=>{
  client.$end();
  done()
});
