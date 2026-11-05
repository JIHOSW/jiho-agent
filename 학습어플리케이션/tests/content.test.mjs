import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,SOURCES} from '../dist/questions.mjs';
import {validatePack} from '../dist/engine.mjs';
test('every shipped question has a usable answer, distinct options and a real listed concept reference',()=>{
 assert.equal(validatePack(QUESTIONS).length,QUESTIONS.length);
 for(const q of QUESTIONS){assert.equal(new Set(q.choices).size,q.choices.length,q.id);assert.ok(SOURCES.some(s=>s.id===q.sourceId&&s.url===q.sourceUrl),q.id);assert.ok(q.recall.length>5);assert.ok(q.memory.length>5);}
});
const fixtures=[
 ['ETF의 시장가격이 10,200원','+2%'],
 ['100만원을 투자해 1년 뒤','8%'],
 ['수익률이 50% 확률로','5%'],
 ['자산 A 60%, B 40%','8%'],
 ['무위험수익률 3%, 시장 기대수익률 8%','9%'],
 ['첫해 +20%, 둘째 해 −20%','96만원'],
 ['수익률 12%, 무위험수익률 2%','0.5'],
 ['실제 수익률 11%','+3%p'],
 ['A와 B의 표준편차는','0.0125'],
 ['포트폴리오가 A 40%, B 60%','0.9'],
 ['주식 60만원·채권 40만원','주식 8만원을 줄여 채권으로 옮긴다'],
 ['수정듀레이션 4인','−2%'],
 ['수정듀레이션 5인','+5%'],
 ['만기 기초자산 가격 120','+12'],
 ['만기 기초자산 가격 80','+14'],
 ['행사가격 100인 콜옵션을','107'],
 ['행사가격 100인 풋옵션을','93'],
 ['기초자산 110, 행사가격 100','4'],
 ['무위험수익률 2%, 시장 기대수익률 7%','9%']
];
for(const [prefix,answer]of fixtures)test(`independently checked calculation: ${prefix}`,()=>{const q=QUESTIONS.find(q=>q.prompt.startsWith(prefix));assert.ok(q);assert.equal(q.choices[q.answer],answer);});
