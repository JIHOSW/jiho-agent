export const SNAPSHOT = '2026-11-04';
export const STAGES = ['목표 합의', '초기 설정', '문서 이관', '사용자 교육', '첫 활용'];
export const CRITERIA = ['고객의 첫 활용 목표·담당자·기한을 합의합니다.', '관리자·부서·문서함 접근 권한을 확인합니다.', '실제 업무 문서를 이관하고 실패 항목을 확인합니다.', '주요 사용자가 등록·공유·검색을 직접 실습합니다.', '합의한 문서 업무를 완료한 기록을 확인합니다.'];
export const CLIENTS = [
 {id:'mono',name:'모노랩',initial:'M',industry:'IT 서비스',users:24,owner:'김서연',completed:2,status:'설정 확인',risk:true,day:7,target:'2026-11-06',goal:'영업팀 24명이 제안서 1건을 등록·공유·검색하기',last:'문서 검색 문의 접수',theme:'blue'},
 {id:'flow',name:'플로우커머스',initial:'F',industry:'이커머스',users:38,owner:'박지훈',completed:2,status:'이관 오류',risk:true,day:12,target:'2026-11-09',goal:'운영팀의 기존 업무 문서 120건을 이관하고 공유하기',last:'문서 12건 이관 실패',theme:'purple'},
 {id:'bridge',name:'브릿지웍스',initial:'B',industry:'비즈니스 서비스',users:52,owner:'정민수',completed:1,status:'권한 확인',risk:true,day:3,target:'2026-11-13',goal:'4개 부서가 부서별 문서함을 열고 자료를 공유하기',last:'초대 사용자 접근 문의',theme:'orange'},
 {id:'orbit',name:'오르빗스튜디오',initial:'O',industry:'디자인',users:16,owner:'이하은',completed:3,status:'교육 예정',risk:false,day:5,target:'2026-11-10',goal:'디자인팀이 프로젝트 파일의 버전을 등록하고 리뷰하기',last:'11월 5일 교육 예정',theme:'pink'},
 {id:'nova',name:'노바리테일',initial:'N',industry:'유통',users:31,owner:'김서연',completed:4,status:'첫 활용 준비',risk:false,day:9,target:'2026-11-06',goal:'점포 운영 매뉴얼을 게시하고 현장 담당자가 검색하기',last:'교육 완료 · 실사용 대기',theme:'teal'},
 {id:'seed',name:'시드앤코',initial:'S',industry:'컨설팅',users:12,owner:'이하은',completed:5,status:'목표 달성',risk:false,day:14,target:'2026-11-04',goal:'실제 고객 제안서 1건의 등록·공유·검색 완료하기',last:'첫 문서 업무 완료',theme:'green'},
];
export const VARIANTS = [
 {id:'base',name:'기본 기록',description:'임시 저장 완료 · 게시 기록 없음'},
 {id:'index-error',name:'게시 후 검색 오류',description:'게시 완료 · 10분 경과 · 색인 실패'},
 {id:'missing',name:'기록 부족',description:'문의만 있고 상태 기록 없음'},
 {id:'conflict',name:'기록 충돌',description:'같은 시점·문서에 서로 다른 상태 기록'},
];
const guide = (id,title,section,text,tags) => ({id,title,section,text,tags,customerId:null,date:SNAPSHOT,type:'제품 가이드'});
export const GUIDES = [
 guide('guide-publish','문서 등록과 게시','§2.1 저장·게시','임시 저장 문서는 작성자만 볼 수 있습니다. 다른 사용자가 사용하려면 문서함을 선택하고 게시해야 합니다. 게시한 문서는 해당 문서함의 권한에 따라 공유됩니다.',['mono','nova','seed']),
 guide('guide-search','검색 반영과 오류 확인','§3.2 검색 색인','검색 색인은 게시 후 최대 5분 이내 반영됩니다. 게시 후 5분이 지나도 검색되지 않으면 문서 ID·게시 시각·접근 권한·색인 상태를 확인합니다. 색인 실패 기록이 있으면 담당 개발자에게 전달합니다.',['mono','nova','seed']),
 guide('guide-import','기존 문서 이관','§4.1 이관 파일','일괄 이관의 필수 항목은 document_id, title, folder_id입니다. folder_id는 먼저 생성된 문서함의 ID여야 합니다. 실패 항목만 수정해 재시도한 뒤 성공 수와 중복 생성 여부를 확인합니다.',['flow']),
 guide('guide-access','사용자 초대와 접근 권한','§1.3 부서·문서함','초대 수락과 문서함 접근 권한 부여는 별개입니다. 관리자는 사용자의 부서와 문서함 역할을 확인하고 필요한 최소 권한을 부여합니다. 전체 공개로 우회하지 않습니다.',['bridge','orbit']),
 guide('guide-training','사용자 교육 운영','§5.1 교육 전 확인','교육 전 로그인, 실습 문서함 권한, 실습 파일 1개를 확인합니다. 교육은 임시 저장과 게시, 문서 검색, 새 버전 등록을 직접 실습하는 순서로 진행합니다.',['orbit','nova']),
 guide('guide-success','첫 활용 완료 기준','§6.1 성공 확인','교육 참석만으로 온보딩을 완료하지 않습니다. 고객이 합의한 실제 업무 문서의 게시와 다른 사용자 접근·검색 기록을 확인한 뒤 피드백을 수집하고 지속 운영으로 인계합니다.',['nova','seed']),
];
const record = (customerId,id,type,title,text) => ({id,customerId,type,title,text,section:'고객 기록',date:SNAPSHOT});
export const RECORDS = {
 mono:[record('mono','mono-inquiry','고객 문의','고객 문의 · 11월 4일','제안서를 저장했는데 동료의 검색 결과에는 보이지 않아요. 팀원들에게 어떻게 안내해야 하나요?'),record('mono','mono-log','시스템 기록','문서 상태 기록 · 10:10','문서 DOC-104 / DRAFT_SAVED 10:10 / 현재 상태 DRAFT / 게시 기록 없음')],
 flow:[record('flow','flow-inquiry','고객 문의','이관 문의 · 11월 4일','문서 120건 중 12건이 오류로 남았습니다. 전체를 다시 올려야 하나요?'),record('flow','flow-log','시스템 기록','이관 검사 결과','120건 중 108건 성공, 12건 실패. 실패 12건: folder_id 값 FIN-OLD는 존재하지 않는 문서함. 중복 생성 기록 없음.')],
 bridge:[record('bridge','bridge-inquiry','고객 문의','접근 문의 · 11월 4일','초대 링크로 로그인했지만 재무팀 문서함이 보이지 않습니다.'),record('bridge','bridge-log','시스템 기록','사용자·권한 상태','초대 수락 완료 / 부서: 미배정 / 재무팀 문서함 역할: 없음. 고객은 해당 사용자의 재무팀 소속 여부를 아직 확인하지 않음.')],
 orbit:[record('orbit','orbit-plan','교육 기록','교육 준비 현황','교육: 2026-11-05 14:00 / 참석 16명. 로그인 확인 12명, 미확인 4명. 실습 문서함 생성 완료. 실습 파일 미수령.')],
 nova:[record('nova','nova-training','교육 기록','교육·첫 활용 현황','11월 3일 사용자 교육 완료, 31명 로그인 확인. 교육용 문서만 존재. 실제 운영 매뉴얼 게시 기록과 다른 사용자 검색 기록은 아직 없음.')],
 seed:[record('seed','seed-log','활용 기록','첫 활용 검증 결과','실제 고객 제안서 DOC-201 게시 완료. 다른 사용자 2명의 문서함 접근 및 검색 성공. 합의된 첫 문서 업무 완료 기준 충족.'),record('seed','seed-feedback','고객 문의','고객 확인','첫 제안서 공유와 검색을 마쳤습니다. 이후 버전관리는 어떻게 운영하면 좋을까요?')],
};
export const INITIAL_TASKS = [
 {id:'task-orbit-prep',clientId:'orbit',actionKey:'training-prep',title:'교육 전 로그인·실습 파일 확인',owner:'이하은',due:'2026-11-05',status:'todo',createdAt:'2026-11-04T00:00:00.000Z'},
 {id:'task-nova-first',clientId:'nova',actionKey:'first-use',title:'첫 매뉴얼 게시 일정 조율',owner:'김서연',due:'2026-11-06',status:'doing',createdAt:'2026-11-04T00:00:00.000Z'},
];
