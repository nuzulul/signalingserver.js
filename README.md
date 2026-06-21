# signalingserver.js
Alternative signaling server that works in browser, no server required.

[>DEMO<](https://nuzulul.github.io/signalingserver.js/demo.html)

## Benefit

* ✅ 0 Dependencies
* ✅ No server required
* ✅ Simple API

## How does it works?

It use free public WebTorrent trackers as transport.

## Ideas

* WebRTC signaling server
* Peer discovery
* Mesh network
* Chat
* Multiplayer

## Install

```
npm install signalingserver.js
```

CDN

* [https://cdn.jsdelivr.net/npm/signalingserver.js/+esm](https://cdn.jsdelivr.net/npm/signalingserver.js/+esm)
* [https://unpkg.com/signalingserver.js](https://unpkg.com/signalingserver.js)
* [https://esm.sh/signalingserver.js](https://esm.sh/signalingserver.js)


## Usage

```
import {createSignalingServer} from 'signalingserver.js';

const config = {
	appid : 'myApp'
}

//create new node
const node = createSignalingServer(config);

//signal handler
node.data((signal)=>{
	console.log(`receive signal : ${signal}`);
});

//broadcast signal
const signal = 'test'; //example
node.send(signal);
console.log(`send signal : ${signal}`);
```

## API

### createSignalingServer(config)

Create new signaling server node

Config : Parameter object 

* appid = (string) Custom application name as identifier
* tracker = (Array) Custom WebTorrent trackers list

### send

Broadcast signal to all node

### data

On receive signal handler

## Recomendation

Encrypt the signal before broadcast it to prevent mitm.

## See Also

* [webConnect.js](https://github.com/nuzulul/webConnect.js) - Auto WebRTC Mesh P2P Network without signaling server.

## License

* [MIT](https://github.com/nuzulul/signaling.js/blob/main/LICENSE) - [Nuzulul Zulkarnain](https://github.com/nuzulul)