declare module "signalingserver.js" {

	export interface Configuration {appid?: string;tracker?: string[];}
	
	export type JSONvalue = string | number | boolean | null | { [key: string]: JSONvalue} | JSONvalue[];
	
	export interface Node {
	
		send: (content: JSONvalue,to_id?: string) => Promise<void>;
		
		data: (fn: (signal: JSONvalue,signal_id?: string) => void) => void;
	}
	
	export function createSignalingServer(config: Configuration): Node;
}