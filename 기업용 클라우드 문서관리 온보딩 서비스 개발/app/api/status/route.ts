import {env} from 'cloudflare:workers';
export function GET(){
 const secrets=env as unknown as Record<string,string>;
 return Response.json({configured:Boolean(secrets.OPENAI_API_KEY||process.env.OPENAI_API_KEY),model:secrets.OPENAI_MODEL||process.env.OPENAI_MODEL||'gpt-4.1-mini'},{headers:{'Cache-Control':'no-store'}});
}
