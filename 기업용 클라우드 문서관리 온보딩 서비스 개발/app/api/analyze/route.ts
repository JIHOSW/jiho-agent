import {env} from 'cloudflare:workers';
import {handleAnalysis} from '../../../lib/firstmile/ai.mjs';
const requests=new Map<string,{time:number,count:number}>();
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'같은 사이트에서 요청해 주세요.'},{status:403});
 const identity=request.headers.get('oai-authenticated-user-id')||request.headers.get('cf-connecting-ip')||'local';
 const now=Date.now();const previous=requests.get(identity);const slot=previous&&now-previous.time<60000?previous:{time:now,count:0};
 if(slot.count>=10)return Response.json({error:'분석은 1분에 10회까지 요청할 수 있습니다. 잠시 후 다시 시도해 주세요.'},{status:429});
 if(requests.size>1000)for(const [key,value]of requests)if(now-value.time>60000)requests.delete(key);
 let body;try{const text=await request.text();if(text.length>16384)throw Error();body=JSON.parse(text);}catch{return Response.json({error:'요청 내용을 확인해 주세요.'},{status:400});}
 slot.count++;requests.set(identity,slot);
 const secrets=env as unknown as Record<string,string>;
 const result=await handleAnalysis(body,{OPENAI_API_KEY:secrets.OPENAI_API_KEY||process.env.OPENAI_API_KEY,OPENAI_MODEL:secrets.OPENAI_MODEL||process.env.OPENAI_MODEL});
 return Response.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
}
