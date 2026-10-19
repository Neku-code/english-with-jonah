export function unpack(response: string | null | undefined): Record<string,string|string[]> {
 try {const x=JSON.parse(response??'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}
}
export function readableResponse(response:string|null|undefined) {
 const x=unpack(response);return Object.keys(x).length?Object.entries(x).map(([k,v])=>`${k.split('-').at(-1)}: ${Array.isArray(v)?v.join(', '):v}`).join('\n'):response??'';
}
