const net = require('net');

function serialize(object) {
  return JSON.stringify(object) + '\n';
}

function deserialize(string) {
  const objects = [];
  let i;
  let l = 0;
  this.buff += Buffer.from(string).toString();
  while ((i = this.buff.indexOf('\n', l)) !== -1) {
    objects.push(JSON.parse(this.buff.slice(l, i)));
    l = i + 1;
  }
  if (l) this.buff = this.buff.slice(l);
  return objects;
}

function errorHandler(req, err) {
  let data = err;
  if(data.hasOwnProperty('message')) {
    data = err.message;
  }
  return this.write(serialize({
    _cmd: 'ON_ERROR',
    id: req.id,
    data,
  }));
}

function call(name, data, response = () => {}, err = () => {}) {
  return new Promise((resolve, reject)=>{
    const id = ++this.micro.id;
    this.micro.clientCallbacks[id] = {
      res: (data) => {
        response(data);
        resolve(data);
      },
      err: (data) => {
        err(data);
        reject(data);
      },
      timeout: setTimeout(() => {
        delete this.micro.clientCallbacks[id];
        err({ error: 'TIMEOUT' });
        reject({ error: 'TIMEOUT' });
      }, this.opts.timeout || this.micro.TIMEOUT)
    };

    this.write(serialize({ id, name, data }));
  });
}

class Micro {
  constructor() {
    this.id = 1;
    this.serverFunctions = {};
    this.clientCallbacks = {};

    this.HOST = '127.0.0.1';
    this.PORT = 3000;
    this.TIMEOUT = 15000;
  }

  add(name, ...functions) {
    this.serverFunctions[name] = functions;
  };

  listen(options = {}, done = () => {}) {
    const onConnection = (socket) => {
      socket.write(serialize({
        _cmd: 'ON_CONNECTION',
        data: Object.keys(this.serverFunctions),
      }));
      socket.buff = '';

      socket.on('data', (data) => {
        const clientRequests = deserialize.call(socket, data);

        for (let req of clientRequests) {
          const fns = this.serverFunctions[req.name];

          function nextMiddleware(i) {
            return new Promise((resolve) => {
              return resolve(fns[i](req.data, (result) => {
                if (fns.length - 1 === i) {
                  return socket.write(serialize({ id: req.id, data: result }));
                } else {
                  if (result) return errorHandler.call(socket, req, result);
                  return nextMiddleware(i + 1);
                }
              }));
            }).catch(errorHandler.bind(socket, req));
          }

          nextMiddleware(0);
        }
      });

      socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          console.error(err);
          process.exit();
        }
      });

      socket.on('close', function() {
        socket.destroy();
      });
    };

    net.createServer(onConnection)
      .listen(options.port || this.PORT, options.host || this.HOST, done);
  }

  createClient(options, cb = () => {}) {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(options.port || this.PORT, options.host || this.HOST);
      client.buff = '';
      client.opts = options;
      client.micro = this;

      client.on('data', (data) => {
        const responses = deserialize.call(client, data);
        responses.forEach((response) => {
          if (response._cmd && response._cmd === 'ON_CONNECTION') {
            const service = {
              $end: client.destroy.bind(client),
            };
            response.data.forEach((fnName) => {
              service[fnName] = call.bind(client, fnName);
            });
            resolve(service);
            return cb(service);
          }

          let callback = this.clientCallbacks[response.id];
          if (callback) {
            clearTimeout(callback.timeout);
            if (response._cmd && response._cmd === 'ON_ERROR') {
              callback.err(response.data);
            } else {
              callback.res(response.data);
            }
            delete this.clientCallbacks[response.id];
          }
        });
      });
    });
  }

}

module.exports = Micro;
