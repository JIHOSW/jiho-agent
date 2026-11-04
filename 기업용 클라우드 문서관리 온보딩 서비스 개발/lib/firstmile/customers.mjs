import {CLIENTS} from './data.mjs';
export const normalizedName=value=>value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function profile(input){
 if(!input||typeof input!=='object')throw Error('고객 정보를 입력해 주세요.');
 const result={name:'',industry:'',owner:'',goal:''};
 for(const [key,max,label]of [['name',60,'회사명'],['industry',40,'업종'],['owner',60,'담당자'],['goal',500,'첫 활용 목표']]){
  if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw Error(`${label}을(를) ${max}자 이내로 입력해 주세요.`);
  result[key]=input[key].trim();
 }
 if(!normalizedName(result.name))throw Error('회사명에 글자 또는 숫자를 입력해 주세요.');
 if(!Number.isInteger(input.users)||input.users<1||input.users>100000)throw Error('사용 인원은 1~100,000명의 정수로 입력해 주세요.');
 if(!validDate(input.startDate)||!validDate(input.target)||input.target<input.startDate)throw Error('유효한 도입일과 목표일을 입력해 주세요. 목표일은 도입일 이후여야 합니다.');
 return {...result,users:input.users,startDate:input.startDate,target:input.target};
}
export function validateCustomer(value){
 if(!value||typeof value.id!=='string'||!/^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt)))throw Error('등록 고객의 식별 정보가 올바르지 않습니다.');
 const p=profile(value);const days=Math.floor((Date.now()-Date.parse(p.startDate+'T00:00:00+09:00'))/86400000)+1;
 return {...p,id:value.id,createdAt:value.createdAt,source:'manual',initial:p.name[0].toUpperCase(),completed:0,status:'자료 확인 필요',risk:false,day:Math.max(0,days),last:'담당자 등록 · 사용 기록 미연결',theme:'blue'};
}
export function createCustomer(existing,input){
 if(!Array.isArray(existing)||existing.length>=200)throw Error('이 데모는 추가 고객을 200곳까지 저장할 수 있습니다.');
 const p=profile(input);
 if([...CLIENTS,...existing].some(c=>normalizedName(c.name)===normalizedName(p.name)))throw Error('같은 이름의 고객이 이미 있습니다.');
 return [...existing,validateCustomer({...p,id:'custom-'+globalThis.crypto.randomUUID(),createdAt:new Date().toISOString()})];
}
