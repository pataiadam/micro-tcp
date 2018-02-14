# micro-tcp
Easy, Fast, Lightweight Asynchronous TCP microservices

## Installation

```
npm install micro-tcp
```

## Usage

### Server

```
const Micro = require('micro-tcp');
const micro = new Micro();

micro.add('sayHi', async (name, res) => res('Hi ' + name + '!'));

micro.listen({ port: 3000 });
```

### Client

```
const Micro = require('micro-tcp');
const micro = new Micro();

micro.createClient({ port: 3000 }, async client => {
  const result = await client.sayHi('Alice');
  console.log(result) // 'Hi Alice!'
});
```

## Example

### Server

```
const Micro = require('./lib');
const micro = new Micro();

const posts = [];

micro.add('post.get', async (index) => posts[index]);
micro.add('post.list', async (params) => {
  const skip = params.skip || 0;
  const limit = params.limit || 10;
  return posts.slice(skip, skip+limit)
});
micro.add('post.create', async (post) => {
  posts.push(post);
  return post;
});

micro.listen({ port: 3000 }, () => console.log('Listening on 3000...'));
```

### Client

```
const Micro = require('./lib');
const micro = new Micro();

micro.createClient({ port: 3000 }, async client => {
  console.log('CONNECTED');
  await client.post.create({title: 'First post'});
  await client.post.create({title: 'Second post'});
  await client.post.create({title: 'Third post'});

  const post = await client.post.get(0);
  console.log(post);

  const posts = await client.post.list({skip: 1, limit: 2})
  console.log(posts);
});

```