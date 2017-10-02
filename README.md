# micro-tcp
Easy, Fast, Lightweight Asynchronous TCP microservices

## Server

```
const micro = require('micro-tcp');

micro.add('sayHi', async (name, res) => res('Hi ' + name + '!'));

micro.listen({ port: 3000 });
```

## Client

```
const micro = require('micro-tcp');

micro.createClient({ port: 3000 }, (client) => {
  client.sayHi('Alice', (result) => {
    console.log(result); // 'Hi Alice!
  })
});
```

Or with async/await:

```
const micro = require('micro-tcp');

async function run() {
  const client = await micro.createClient({ port: 3000 });
  const result = await client.sayHi('Alice');
  console.log(result) // 'Hi Alice!'
}
run();
```