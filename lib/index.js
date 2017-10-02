const net = require('net');
const serverFunctions = {};
const clientCallbacks = {};
let id = 1;
let HOST = '127.0.0.1';
let PORT = 3000;
let TIMEOUT = 15000;

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

function call(name, data, response = () => {}, err = () => {}) {
  return new Promise((resolve)=>{
    id++;
    this.write(serialize({
      id,
      name,
      data
    }));
    clientCallbacks[id] = {
      res: (data) => {
        response(data);
        resolve(data);
      },
      err,
      timeout: setTimeout(() => {
        delete clientCallbacks[id];
        err({ error: 'TIMEOUT' });
      }, this.opts.timeout || TIMEOUT)
    };
  });
}

function errorHandler(err) {
  // TODO: error handling
  console.error('NOT IMPLEMENTED YET');
  console.error(err);
}

module.exports = {
  add(name, ...functions) {
    serverFunctions[name] = functions;
  },
  listen(options = {}) {
    net.createServer(function onConnect(socket) {
      socket.write(serialize({
        _cmd: 'ON_CONNECTION',
        data: Object.keys(serverFunctions)
      }));
      socket.buff = '';

      socket.on('data', function(data) {
        const clientRequests = deserialize.call(socket, data);
        for (let req of clientRequests) {
          const fns = serverFunctions[req.name];

          function nextMiddleware(i) {
            if (fns.length - 1 === i) {
              return new Promise((resolve) => {
                return resolve(
                  fns[i](
                    req.data,
                    (res) => socket.write(serialize({
                      id: req.id,
                      data: res
                    })),
                  ),
                );
              }).catch(errorHandler);
            }
            return new Promise(resolve => {
              return resolve(
                fns[i](
                  req.data,
                  (err) => {
                    if (err) return errorHandler(err);
                    return nextMiddleware(i + 1);
                  },
                ),
              );
            }).catch(errorHandler);
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
        console.log('Client closed');
        socket.destroy();
      });
    }).listen(options.port || PORT, options.host || HOST);
  },
  createClient(options, cb = () => {}) {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(options.port || PORT, options.host || HOST);
      client.buff = '';
      client.opts = options;

      client.on('data', function(data) {
        const responses = deserialize.call(client, data);
        responses.forEach((response) => {
          if (response._cmd && response._cmd === 'ON_CONNECTION') {
            const service = {};
            response.data.forEach((fnName) => {
              service[fnName] = call.bind(client, fnName);
            });
            resolve(service);
            return cb(service);
          }

          let callback = clientCallbacks[response.id];
          if (callback) {
            clearTimeout(callback.timeout);
            callback.res(response.data);
            delete clientCallbacks[response.id];
          }
        });
      });
    });
  },
};