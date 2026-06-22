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
* P2P matchmaking

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

const node = createSignalingServer(config);

node.data((signal,signal_id)=>{

	//handle signal
	console.log(`receive signal : ${signal}`);

	if(signal_id){
		//send answer signal
		const msg = 'answer signal';
		node.send(msg,signal_id);
	}
	
});

//broadcast signal
const msg = 'offer signal';
node.send(msg);
```

## API

### createSignalingServer(config)

Create new signaling server node

config : configuration object 

* appid = (string) Custom unique application ID
* tracker = (Array) Custom WebTorrent tracker list

### send(signal,signal_id)

Send signal to other node, leave out signal_id paramater to broadcast.

### data(callback)

Listen for event with callback function containing parameter :
* (signal,signal_id) - event from broadcaster offer
* (signal) - event form other node answer

## Recomendation

Encrypt the signal before send it to prevent appearing plaintext data in the network logger.

## See Also

* [webConnect.js](https://github.com/nuzulul/webConnect.js) - Auto WebRTC Mesh P2P Network without signaling server.

## License

* [MIT](https://github.com/nuzulul/signalingserver.js/blob/main/LICENSE) - [Nuzulul Zulkarnain](https://github.com/nuzulul)