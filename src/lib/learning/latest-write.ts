/** Coalesce checkpoints without putting network latency on local navigation. */
export class LatestWriteQueue<T> {
 private pending: {value:T}|null=null;
 private running:Promise<void>|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 constructor(private write:(value:T)=>Promise<void>,private onError:(error:unknown)=>void,private delay=250) {}
 enqueue(value:T){this.pending={value};clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush().catch(this.onError);},this.delay);}
 async flush():Promise<void>{
  clearTimeout(this.timer);
  if(this.running){await this.running;if(this.pending)await this.flush();return;}
  this.running=(async()=>{while(this.pending){const next=this.pending;this.pending=null;try{await this.write(next.value);}catch(e){this.pending??=next;throw e;}}})();
  try{await this.running;}finally{this.running=null;}
 }
 stop(){clearTimeout(this.timer);}
}
