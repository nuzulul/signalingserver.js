/**
 * signalingserver.js - Alternative signaling server that works in browser, no server required.
 * https://github.com/nuzulul/signalingserver.js
 * License MIT - 2026 - Nuzulul Zulkarnain
 */

const defaultTrackers = [
	'wss://tracker.webtorrent.dev',
	'wss://tracker.openwebtorrent.com',
	'wss://tracker.btorrent.xyz'
];
const defaultAppId = 'global';
const appName = 'signaling.js';
const hashLimit = 20;
const trackerAction = 'announce';
const intervalMs = 30000;
const {values} = Object;
const offerPoolSize = 25;
const charSet = '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
const createId = () => new Array(20).fill().map(()=>charSet[Math.floor(Math.random() * charSet.length)]).join('');
const encodeBytes = txt => new TextEncoder().encode(txt);
const handledContent = {};
const myid = createId();

const createSignalingServer = (config={}) => {
	
	const sockets = {};
	const socketListeners = {};
	const handledOffers = {};
	const handledAnswer = {};	
	
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
	
	let strategy = [
		torrent(config),
		achex(config)
	]
	
	const send = (content,to_id) => {
		const content_id = createId();
		strategy.forEach((item) => {
			item.send(content,content_id,to_id);
		})
	}
	
	strategy.forEach((item) => {
		item.data((content,id)=>{
			contentHandler(content,id);
		})
	})
	
	let contentHandler = ()=>{};
	const data = handle => (contentHandler = handle);	
	
	return {send,data};
}

const torrent = (config) => {
	
	const myid = createId();
	const sockets = {};
	const socketListeners = {};
	const handledOffers = {};
	const handledAnswer = {};	
	
	const createInfoHash = crypto.subtle
		.digest('SHA-1', encodeBytes(`${appName}:${config.appid}`))	
		.then(buffer => 
			Array.from(new Uint8Array(buffer))
				.map(b => b.toString(36))
				.join('')
				.slice(0,hashLimit)
		)
		
	const send = async (content,content_id,to_id) => {
		
		if(to_id && JSON.parse(atob(to_id)).strategy !== 'torrent'){
			return;
		}
		
		const infoHash = await createInfoHash;
		if(to_id){
			content = {
						type : 'answer',
						sdp :JSON.stringify({content,content_id})
					}
		}else{
			const sdp_id = createId();
			content = new Array(offerPoolSize).fill().map(()=>{
				const offer_id = createId();
				return 	{
							offer : {
								type : 'offer',
								sdp : JSON.stringify({sdp_id,content,content_id})
							},
							offer_id
						}
			})
		}
		config.tracker.forEach(async url => {
			const socket = makeSocket(url,infoHash);
			if(socket.readyState === WebSocket.OPEN){
				announce(socket,infoHash,content,to_id);
			}else if(socket.readyState !== WebSocket.CONNECTING){
				announce(await makeSocket(url,infoHash),infoHash,content,to_id);
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
					values(socketListeners[url]).forEach(f => f(socket,e));
				socket.onerror = e =>
					delete sockets[url];
				socket.onclose = e =>
					delete sockets[url];
			})
		}else{
			socketListeners[url][infoHash] = onSocketMessage;
		}
		return sockets[url];
	}
	
	const announce = async (socket,infoHash,content,to_id) => {
		
		if(to_id){
			
			let id;
			try{
				id = JSON.parse(atob(to_id));
			}catch(e){
				console.warn(e);
				return;
			}
			
			socket.send(
				JSON.stringify({
					action : trackerAction,
					info_hash : infoHash,
					peer_id : myid,
					to_peer_id : id.peer_id,
					offer_id : id.offer_id,
					answer : content
				})
			)
			
		} else {
			socket.send(
				JSON.stringify({
					action : trackerAction,
					info_hash : infoHash,
					peer_id : myid,
					numwant : offerPoolSize,
					offers : content
				})
			)
		}
	}
	
	const onSocketMessage = async (socket,e) => {
		const infoHash = await createInfoHash;
		let val;
		
		try{
			val = JSON.parse(e.data);
		}catch(e){
			//console.warn(e);
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
			//console.warn(failure);
			return;
		}
		
		if(val.offer){
			
			const content_id = JSON.parse(val.offer.sdp).content_id;
			if(handledContent[content_id]){
				return;
			}
			handledContent[content_id] = true;
			
			const sdp_id = JSON.parse(val.offer.sdp).sdp_id;
			if(handledOffers[sdp_id]){
				return;
			}
			
			handledOffers[sdp_id] = true;			
			
			const id = btoa(JSON.stringify({
				strategy: 'torrent',
				offer_id : val.offer_id,
				peer_id : val.peer_id
			}))
			
			const content = JSON.parse(val.offer.sdp).content;
			contentHandler(content, id);
		}
		
		if(val.answer){
			
			const content_id = JSON.parse(val.answer.sdp).content_id;
			if(handledContent[content_id]){
				return;
			}
			handledContent[content_id] = true;			
			
			if(handledAnswer[val.peer_id+val.offer_id]){
				return;
			}
			
			handledAnswer[val.peer_id+val.offer_id] = true;			
			const content = JSON.parse(val.answer.sdp).content;
			contentHandler(content);
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
	
	return {send,data};
}

const achex = (config) => {
	
	const name = appName+'#'+config.appid;
	
	const url = 'wss://cloud.achex.ca';
	
	let sockets;
	
	let socketListeners;
	
	const makeSocket = (url) => {
		if(!sockets){
			socketListeners = onSocketMessage;
			sockets = new Promise(res => {
				const socket = new WebSocket(url);
				socket.onopen = e => {
					socket.send(JSON.stringify({
						auth:myid,
						passwd:"none"
					}));
				}
				socket.onmessage = e => {
					socketListeners(socket,e);
					const val = JSON.parse(e.data);
					if(val.auth === 'OK'){
						socket.send(JSON.stringify({
							joinHub:name
						}));
					}
					if(val.joinHub === 'OK'){
						res(socket);
					}					
				}
				socket.onerror = e => {
					sockets = undefined;
					makeSocket(url);
				}
				socket.onclose = e => {
					sockets = undefined;
					makeSocket(url);
				}
			})
		}
		return sockets;
	}	
	
	const onSocketMessage = (socket,e) => {
		const val = JSON.parse(e.data);
		
		if(!val.msg){
			return;
		}
		
		const content_id = val.msg.content_id;
		if(handledContent[content_id]){
			return;
		}
		handledContent[content_id] = true;		
		
		if(val.msg.to_peer_id){
			const id = JSON.parse(atob(val.msg.to_peer_id))
			if(id.peer_id === myid){
				const content = val.msg.content;
				contentHandler(content);				
			}
		}else{
			const id = btoa(JSON.stringify({
				strategy: 'achex',
				peer_id : val.msg.peer_id
			}))
			const content = val.msg.content;
			contentHandler(content, id);			
		}
	}
	
	const send = async (content,content_id,to_id) => {
		
		const socket = await makeSocket(url);
		if(socket.readyState === WebSocket.OPEN){
			announce(socket,content,content_id,to_id);
		}else if(socket.readyState !== WebSocket.CONNECTING){
			announce(await makeSocket(url),content,content_id,to_id);
		}
		
	}
	
	const announce = (socket,content,content_id,to_id) => {
		
		if(to_id){
			content = {
				content,
				content_id,
				peer_id : myid,
				to_peer_id : to_id
				
			}			
		}else{
			content = {
				content,
				content_id,
				peer_id : myid
			}
		}
		
		socket.send(JSON.stringify({
			toH:name,
			channel:"public",
			msg:content
		}))
		
	}
	
	makeSocket(url);
	
	let contentHandler = ()=>{};
	const data = handle => (contentHandler = handle);	
	
	return {send,data};
}

export default createSignalingServer;

export {createSignalingServer};