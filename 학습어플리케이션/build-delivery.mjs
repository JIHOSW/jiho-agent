import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dist=resolve('dist'),out=resolve('outputs');
await mkdir(out,{recursive:true});
const read=name=>readFile(resolve(dist,name),'utf8');
const [template,css,icon,questions,engine,app]=await Promise.all(['index.html','style.css','icon.svg','questions.mjs','engine.mjs','app.mjs'].map(read));
const moduleSource=[questions,engine,app.replace(/^import .*?;\s*$/gm,'')].join('\n').replace(/^export /gm,'');
// Compile the combined code without executing browser code to catch module-name collisions.
new Function(moduleSource);
const iconData='data:image/svg+xml,'+encodeURIComponent(icon);
const html=template.replace('<link rel="stylesheet" href="style.css">',`<style>\n${css}\n</style>`).replace(/\s*<link rel="manifest"[^>]*>/,'').replace('href="icon.svg"',`href="${iconData}"`).replace('<script type="module" src="app.mjs"></script>',`<script type="module">\n${moduleSource.replace(/src="icon.svg"/g,`src="${iconData}"`)}\n</script>`);
await writeFile(resolve(out,'touun-night.html'),html);
await writeFile(resolve(out,'사용방법.txt'),'오혜지 합격 기원 지호의 응원\n\n휴대폰에서는 공개 사이트 링크를 Safari나 Chrome으로 열어주세요.\n오늘의 공부 시작 → 보기 전 떠올리기 → 정답 확인 → 확신 표시 순서로 공부해요.\n헷갈린 문제는 간격을 두고 다시 나오며, 다음 공부에도 먼저 만나요.\n30분이 되면 마무리를 안내해요. 일시정지와 이어 풀기도 가능해요.\n\n설정에서 글자 크기와 화면 색을 바꿀 수 있어요.\n학습 기록은 각 기기 브라우저에만 저장돼요. 다른 기기로 옮길 때는 기록 백업/가져오기를 이용해주세요.\n자료실에서 내 문제 직접 입력 또는 JSON 문제 팩 가져오기를 사용할 수 있어요. PDF/사진 자동 추출 기능은 없어요.\n\n기본 72문항은 공식 교육자료의 개념을 참고해 직접 만든 연습문제이며, 공식 기출이나 출판사 문제 복제본이 아니에요. 세제·부동산·법규 전 범위는 포함하지 않으므로 교재를 함께 확인해주세요.\n\n첨부 HTML은 인터넷 없이도 열 수 있는 별도 파일판이에요. 일부 휴대폰 파일 미리보기에서는 JavaScript가 실행되지 않으니 실제 브라우저에서 열거나 공개 링크를 사용해주세요.\n');
console.log(JSON.stringify({portable:resolve(out,'touun-night.html'),bytes:Buffer.byteLength(html)}));
