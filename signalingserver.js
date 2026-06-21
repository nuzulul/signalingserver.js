/**
* signalingserver.js by Nuzulul Zulkarnain
* https://github.com/nuzulul/signalingserver.js
**/

const defaultTrackers = [
	'wss://tracker.webtorrent.dev',
	'wss://tracker.openwebtorrent.com',
	'wss://tracker.btorrent.xyz',
	'wss://tracker.files.fm:7073/announce'
];
const defaultAppId = 'global';
const appName = 'signaling.js';
const hashLimit = 20;
const sockets = {};
const socketListeners = {};
const trackerAction = 'announce';
const intervalMs = 30000;
const {values} = Object;
const offerPoolSize = 10;
const charSet = '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
const createId = () => new Array(20).fill().map(()=>charSet[Math.floor(Math.random() * charSet.length)]).join('');
const myid = createId();
const encodeBytes = txt => new TextEncoder().encode(txt);
let handledOffers = {}

const createSignalingServer = (config={}) => {
	
	//use default appid if empty
	if(!config.appid){
		config.appid = defaultAppId;
	}
	
	//use default tracker if empty
	if(!config.tracker){
		config.tracker = defaultTrackers;
	}
	
	//validate tracker length is not empty
	if(!config.tracker.length){
		throw new Error(`Tracker list is empty`);
	}

	const createInfoHash = crypto.subtle
		.digest('SHA-1', encodeBytes(`${appName}:${config.appid}`))	
		.then(buffer => 
			Array.from(new Uint8Array(buffer))
				.map(b => b.toString(36))
				.join('')
				.slice(0,hashLimit)
		)
		
	const send = async (content) => {
		const infoHash = await createInfoHash;
		const offer_id = createId()
		config.tracker.forEach(async url => {
			const socket = makeSocket(url,infoHash);
			if(socket.readyState === WebSocket.OPEN){
				announce(socket,infoHash,content,offer_id);
			}else if(socket.readyState !== WebSocket.CONNECTING){
				announce(await makeSocket(url,infoHash),infoHash,content,offer_id);
			}
		})
	}
		
	const makeSocket = (url,infoHash) => {
		if(!sockets[url]){
			socketListeners[url] = {[infoHash]: onSocketMessage};
			sockets[url] = new Promise(res => {
				const socket = new WebSocket(url);
				socket.onopen = res.bind(null,socket);
				socket.onmessage = e =>
					values(socketListeners[url]).forEach(f => f(socket,e))
			})
		}else{
			socketListeners[url][infoHash] = onSocketMessage;
		}
		return sockets[url];
	}
	
	const announce = async (socket,infoHash,content,offer_id) => 
		socket.send(
			JSON.stringify({
				action : trackerAction,
				info_hash: infoHash,
				peer_id: myid,
				numwant:offerPoolSize,
				offers:[
					{
						offer:{
							type: 'offer',
							sdp:content
						},
						offer_id
					}
				]
			})
		)
	
	const onSocketMessage = async (socket,e) => {
		const infoHash = await createInfoHash;
		let val;
		
		try{
			val = JSON.parse(e.data);
		}catch(e){
			console.warn(e);
			return;
		}
		
		if(val.info_hash !== infoHash){
			return;
		}
		
		if(val.peer_id && val.peer_id === myid){
			//got self message
			return;
		}		
		
		const failure = val['failure reason'];
		if(failure){
			console.warn(failure);
			return;
		}
		
		if(handledOffers[val.offer_id]){
			return;
		}
		
		handledOffers[val.offer_id] = true;
		
		if(val.offer){
			contentHandler(val.offer.sdp);
		}
		
		return;
	}
	
	let contentHandler = ()=>{};
	const data = handle => (contentHandler = handle);
	
	const auto = async () => {
		const infoHash = await createInfoHash;
		config.tracker.forEach(async url => {
			const socket = makeSocket(url,infoHash);
		})
	}
	const announceInterval = setInterval(auto, intervalMs);
	auto();
	
	return {send,data}
	
}

export default createSignalingServer;

export {createSignalingServer};