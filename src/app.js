function validGrade(grade){return grade==='4'||grade==='5'||grade==='3'||grade==='pre2'||grade==='2'||grade==='pre1'}
function gradeLabel(grade){return grade==='pre2'?'準2級':grade==='pre1'?'準1級':grade+'級'}
function questionsForGrade(grade=state?.grade||'4'){return typeof QUESTION_BANKS==='undefined'?undefined:QUESTION_BANKS?.[grade]}
function reviewBanks(grade){return[questionsForGrade(grade),typeof REVIEW_ARCHIVE==='undefined'?undefined:REVIEW_ARCHIVE?.[grade]].filter(bank=>bank&&typeof bank==='object')}
function questionById(id,grade=state?.grade||'4'){
 if(typeof id!=='string'||!validGrade(grade))return null;
 for(const bank of reviewBanks(grade))for(const [cat,qs] of Object.entries(bank)){
  if(!Array.isArray(qs))continue;
  const q=qs.find(q=>q?.id===id);
  if(q)return{cat,q,id};
 }
 return null;
}
function questionKind(q){return q.kind||(q.en?'writing':q.words?'order':q.t==='pic'||q.t==='qa'?'legacy-listening':'choice')}
const $=s=>document.querySelector(s);
const SAVE_KEY='eikenTownSave_v1';
const LV_NEED={1:6,2:16},LV_COST={1:40,2:100};
const GRID=11,TILE=3.0,PITCH=2.9;
const NAME_IDEAS=['サクラタウン','ひまわり町','みらいシティ','こはる村','スターヒルズ','にじがわ町','あおぞらシティ'];
const ROAD={id:'__road',name:'道路',emoji:'🛣️',cost:10};
const FB_DECO=['🌱','🌼','🍄','🌿','🦋','🌱','🌸','🍀','🌷','🐞','🌻','🐝','🍀','🌼','🌱','🦋','🌿','🌸','🍄','🌱','🌼','🍀','🌻','🌿','🐞','🌱','🌼','🍄','🌿','🦋','🌱','🌸','🍀','🌷','🐞','🌻','🐝','🍀','🌼','🌱','🦋','🌿','🌸','🍄','🌱','🌼','🍀','🌻','🌿'];
const CAT_TAG={library:'📚 たんご',school:'🏫 ぶんぽう',cafe:'☕️ かいわ',station:'🚉 じゅんじょ',park:'👂 ちょうかい',flower:'✏️ さくぶん',essay:'✍️ さくぶん',summary:'📝 ようやく',review:'🗼 ふくしゅう'};
function catTag(cat,grade=state?.grade||'4'){return cat==='flower'?(grade==='5'?'✏️ さくぶん':'読解（どっかい）'):cat==='station'&&grade==='pre1'?'📖 ちょうぶんほきゅう':CAT_TAG[cat]}
function buildingDesc(cat,grade=state?.grade||'4'){return cat==='flower'&&grade!=='5'?'読解：掲示・メール・物語を<br class="mbr">読もう':cat==='station'&&grade==='pre1'?'長文の空所を<br class="mbr">埋めよう':B[cat].desc}
function flowerGuide(grade){return grade==='5'?'お花屋さんは任意の<br class="mbr">追加作文練習（2問）で、<br class="wbr"><br class="mbr">本番の試験ではありません。':'お花屋さんは読解練習。<br class="wbr"><br class="mbr">レベルに応じて一つの文章と<br class="mbr">2・3・5問に挑戦します。'}
function writingChecks(grade,summary){return[(summary?'文章の要点を自分の言葉でまとめられた':grade==='5'?'5〜15語を目標に、短い英文を書いた':grade==='3'?'25〜50語を目標に、理由を2つ書いた':grade==='pre2'?'50〜80語を目標に、理由を2つ書いた':grade==='2'?'80〜100語を目標に、理由を2つ書いた':grade==='pre1'?'120〜150語を目標に、理由を2つ書いた':'15〜25語を目標に書いた'),'大文字とピリオドを忘れていない','スペルをていねいにチェックした']}
const WRITING_RANGE={'5':[5,15],'3':[25,50],'pre2':[50,80],'2':[80,100],'pre1':[120,150]};
const SUMMARY_RANGE={'pre2':[25,35],'2':[45,55],'pre1':[60,90]};
const BUILDINGS=[
{id:'library',name:'図書館',emoji:'📚',cat:'library',cost:0,req:null,grades:['5','4','3','pre2','2','pre1'],desc:'単語(たんご)クイズ'},
{id:'school',name:'学校',emoji:'🏫',cat:'school',cost:30,req:'library',grades:['5','4','3','pre2','2','pre1'],desc:'文法(ぶんぽう)クイズ'},
{id:'cafe',name:'カフェ',emoji:'☕️',cat:'cafe',cost:60,req:'school',grades:['5','4','3','pre2','2','pre1'],desc:'会話(かいわ)クイズ'},
{id:'station',name:'駅',emoji:'🚉',cat:'station',cost:100,req:'cafe',grades:['5','4','3','pre2','2','pre1'],desc:'並べかえ(じゅんばん)クイズ'},
{id:'park',name:'公園',emoji:'🌳',cat:'park',cost:150,req:'station',grades:['5','4','3','pre2','2','pre1'],desc:'リスニング(ちょうかい)'},
{id:'flower',name:'お花屋さん',emoji:'🌷',cat:'flower',cost:200,req:'park',grades:['5','4','3','pre2','2','pre1'],desc:'任意の追加作文練習（本番の試験ではありません）'},
{id:'essay',name:'さくぶん工房',emoji:'✍️',cat:'essay',cost:250,req:'flower',grades:['3','pre2','2','pre1'],desc:'本番形式の英作文（3級・準2級・2級・準1級のみ）'},
 {id:'summary',name:'まとめ塾',emoji:'📝',cat:'summary',cost:300,req:'essay',grades:['pre2','2','pre1'],desc:'要約（本番形式・準2級・2級・準1級のみ）'},
 {id:'review',name:'復習タワー',emoji:'🗼',cat:'review',cost:0,req:null,grades:['5','4','3','pre2','2','pre1'],desc:'まちがえた問題のふくしゅう専用（町のランクには数えないよ）'}
];
const B=Object.fromEntries(BUILDINGS.map(b=>[b.cat,b]));
function buildingGrades(b){return b.grades||['4','5','3','pre2','2']}
function countableBuildings(grade){return BUILDINGS.filter(b=>b.cat!=='review'&&buildingGrades(b).includes(grade))}
function reqFor(b,grade){if(!b.req)return null;if(b.req&&B[b.req]&&buildingGrades(B[b.req]).includes(grade))return B[b.req];const a=BUILDINGS.filter(x=>buildingGrades(x).includes(grade));const i=a.findIndex(x=>x.cat===b.cat);return i>0?a[i-1]:null}
const DECOS=[
 {id:'flowerbed',name:'花壇',emoji:'🌼',cost:5,desc:'お花いっぱいの小さな花壇'},
 {id:'bench',name:'ベンチ',emoji:'🪑',cost:10,desc:'ひと休みできるベンチ'},
 {id:'fountain',name:'噴水',emoji:'⛲',cost:20,desc:'水がキラキラ光る噴水'},
 {id:'lamp',name:'街灯',emoji:'💡',cost:10,desc:'夜道を明るく照らす街灯'},
 {id:'sign',name:'案内板',emoji:'🪧',cost:5,desc:'まちの案内板'},
 {id:'swing',name:'ブランコ',emoji:'🛝',cost:15,desc:'ゆらゆら楽しいブランコ'},
 {id:'mailbox',name:'ポスト',emoji:'📫',cost:5,desc:'赤いポスト'},
 {id:'clocktower',name:'時計台',emoji:'🕰️',cost:20,desc:'時を刻む時計台'},
 {id:'busstop',name:'バス停',emoji:'🚏',cost:10,desc:'バスを待つバス停'}
];
const D=Object.fromEntries(DECOS.map(d=>[d.id,d]));
function validDeco(id){return typeof id==='string'&&Object.hasOwn(D,id)}
function decoIdOf(sel){return typeof sel==='string'&&sel.startsWith('deco:')?sel.slice(5):null}
function decoAt(t){return (state.decorations||[]).find(d=>d.tile===t)}
function roads(){return state.roads||[]}

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const norm=s=>s.toLowerCase().replace(/[.!?,]/g,'').replace(/\s+/g,' ').trim();

let state=null;
let towns={},activeGrade='4',legacyLoaded=false;
function freshState(grade='4'){const s={v:5,grade:validGrade(grade)?grade:'4',g:GRID,townName:'',coins:50,placed:{},progress:{},unlocked:['library'],roads:[],decorations:[],totalCorrect:0,totalAnswered:0,review:[],sound:true,lowGfx:false};updateUnlocks(s);return s}
function updateUnlocks(s){
 const unlocked=new Set((Array.isArray(s.unlocked)?s.unlocked:[]).filter(cat=>Object.hasOwn(B,cat)&&B[cat]&&buildingGrades(B[cat]).includes(s.grade)));
 unlocked.add('library');
 const avail=BUILDINGS.filter(b=>buildingGrades(b).includes(s.grade));
  avail.forEach((b,i)=>{
   if(i===0||!b.req||s.placed[b.cat]||s.placed[avail[i-1].cat]||(b.req&&s.placed[b.req]))unlocked.add(b.cat);
  });
 s.unlocked=[...unlocked];
}
function validCat(cat){return typeof cat==='string'&&Object.hasOwn(B,cat)}
function validTile(t){return Number.isInteger(t)&&t>=0&&t<GRID*GRID}
function validReview(id,grade=state?.grade||'4'){return !!questionById(id,grade)}
function migrate(d,grade='4'){
 if(!validGrade(grade)||!d||typeof d!=='object'||Array.isArray(d))return null;
 const defaults=freshState(grade);
 const s=Object.assign(freshState(grade),d);
 s.v=5;
 s.grade=grade;
 if(typeof s.townName!=='string')s.townName='';
 s.townName=s.townName.slice(0,12);
 s.sound=!!s.sound;s.lowGfx=!!s.lowGfx;
 for(const key of ['coins','totalCorrect','totalAnswered']){
  if(!Number.isFinite(s[key])||s[key]<0)s[key]=defaults[key];
  else s[key]=Math.min(9999999,Math.floor(s[key]));
 }
 s.progress=Object.fromEntries(Object.entries(s.progress&&typeof s.progress==='object'&&!Array.isArray(s.progress)?s.progress:{}).filter(([cat,n])=>validCat(cat)&&Number.isFinite(n)&&n>=0).map(([cat,n])=>[cat,Math.min(9999999,Math.floor(n))]));
 s.review=[...new Set((Array.isArray(s.review)?s.review:[]).map(id=>{
  if(typeof id==='string'){
   const legacy=id.match(/^g(pre2|2)-essay-(10[7-9]|11[0-2])$/);
   if(legacy){
    const nid=`g${legacy[1]}-summary-${Number(legacy[2])-6}`;
    if(validReview(nid,grade))return nid;
   }
  }
  if(validReview(id,grade))return id;
  if(grade!=='4'||(d.v!==undefined&&d.v>4)||typeof id!=='string')return null;
  const match=id.match(/^([a-z]+):(\d+)$/);
  if(!match||!validCat(match[1]))return null;
   for(const bank of reviewBanks('4')){
    const qs=bank[match[1]];
    const q=Array.isArray(qs)?qs.find(q=>q?.legacyIndex===Number(match[2])):null;
    if(q)return q.id;
   }
   return null;
 }).filter(Boolean))];
 const oldG=Number.isInteger(d.g)&&d.g>0&&d.g<=20?d.g:5;
 const remap=t=>{
  let c=t%oldG,r=Math.floor(t/oldG);
  c=Math.min(c,GRID-1);r=Math.min(r,GRID-1);
  return r*GRID+c;
 };
 const fixed={},occ=new Set();
 Object.entries(s.placed||{}).forEach(([cat,p])=>{
  if(!validCat(cat)||!buildingGrades(B[cat]).includes(grade)||!p||typeof p!=='object'||!Number.isFinite(p.level)||p.level<0)return;
  let t;
  if('lot' in p){
   if(!Number.isInteger(p.lot)||p.lot<0||p.lot>=16)return;
   t=Math.min(GRID*GRID-1,Math.floor(p.lot/4)*oldG+(p.lot%4));
  }else{
   if(!Number.isInteger(p.tile)||p.tile<0||p.tile>=oldG*oldG)return;
   t=remap(p.tile);
  }
  if(!validTile(t)||occ.has(t))return;
  fixed[cat]={tile:t,level:Math.max(1,Math.min(3,Math.floor(p.level)))};
  occ.add(t);
 });
 s.placed=fixed;
 s.g=GRID;
 s.roads=[...new Set(
  (Array.isArray(s.roads)?s.roads:[]).filter(t=>Number.isInteger(t)&&t>=0&&t<oldG*oldG)
   .map(t=>oldG!==GRID?remap(t):t)
   .filter(t=>validTile(t)&&!occ.has(t))
 )];
 const docc=new Set();
 s.decorations=(Array.isArray(s.decorations)?s.decorations:[])
  .filter(d=>d&&typeof d==='object'&&validDeco(d.kind)&&Number.isInteger(d.tile)&&d.tile>=0&&d.tile<oldG*oldG)
  .map(d=>({tile:oldG!==GRID?remap(d.tile):d.tile,kind:d.kind}))
  .filter(d=>{if(!validTile(d.tile)||occ.has(d.tile)||s.roads.includes(d.tile)||docc.has(d.tile))return false;docc.add(d.tile);return true});
 updateUnlocks(s);
 return s;
}
function storageError(){
 $('#save-error').textContent='保存できませんでした。この画面のデータは残っています。再読み込みせず、保存を再試行してください。';
 $('#save-error').classList.remove('hidden');
 $('#save-retry').classList.remove('hidden');
}
let loadBlocked=false,pendingRaw=null;
function loadBlockError(kind){
 loadBlocked=true;
 $('#save-error').textContent=kind==='read'
  ?'保存データの読み込みに失敗しました。データは消していません。再試行で読み込みます。'
  :kind==='unsupported'
  ?'このセーブデータは対応していない形式のため読み込めません。データは消していません。'
  :'セーブデータの形式が不正なため読み込めません。データは消していません。';
 $('#save-error').classList.remove('hidden');
 $('#save-retry').classList.remove('hidden');
}
function readRaw(){
 try{return{ok:true,raw:localStorage.getItem(SAVE_KEY)}}
 catch(e){return{ok:false}}
}
function loadState(){
 loadBlocked=false;pendingRaw=null;
 const r=readRaw();
 if(!r.ok){loadBlockError('read');return null}
 const raw=r.raw;
 if(!raw){towns={};activeGrade='4';legacyLoaded=false;return null}
 let d=null;
 try{d=JSON.parse(raw)}catch(e){}
 if(d&&typeof d==='object'&&!Array.isArray(d)&&d.v===5){
  if(!d.towns||typeof d.towns!=='object'||Array.isArray(d.towns)){loadBlockError('malformed');return null}
  const next={},nextGrade=validGrade(d.activeGrade)?d.activeGrade:'4';
  for(const grade of ['4','5','3','pre2','2','pre1']){
   if(!Object.hasOwn(d.towns,grade))continue;
   const town=migrate(d.towns[grade],grade);
   if(!town){loadBlockError('malformed');return null}
   next[grade]=town;
  }
  towns=next;activeGrade=nextGrade;legacyLoaded=false;
 }else if(d&&typeof d==='object'&&!Array.isArray(d)&&!('towns' in d)&&!('activeGrade' in d)&&(d.v===undefined||d.v===1||d.v===2||d.v===3||d.v===4)){
  const town=migrate(d,'4');
  if(!town){loadBlockError('malformed');return null}
  towns={'4':town};legacyLoaded=true;activeGrade='4';
 }else{
  loadBlockError('unsupported');return null;
 }
 return towns[activeGrade]||null;
}
function retryLoad(){
 if(!loadBlocked){persistTowns();return}
 const result=loadState();
 if(loadBlocked)return;
 if(result){
  state=result;freshStart=false;
 }else{
  state=freshState(activeGrade);
  try{
   if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)state.lowGfx=true;
  }catch(e){}
  freshStart=true;
 }
 $('#save-error').classList.add('hidden');
 $('#save-retry').classList.add('hidden');
 applyGfx();refreshHUD();refreshNameUI();renderStats();
 show('scr-title');
}
function persistTowns(nextTowns=towns){
 if(loadBlocked){loadBlockError('read');return false}
 try{
  localStorage.setItem(SAVE_KEY,JSON.stringify({v:5,activeGrade,towns:nextTowns}));
  legacyLoaded=false;
  $('#save-error').classList.add('hidden');
  $('#save-retry').classList.add('hidden');
  return true;
 }catch(e){storageError();return false}
}
function save(){
 if(loadBlocked)return false;
 freshStart=false;
 towns[state.grade]=state;
 return persistTowns();
}
function exportSaveJSON(){
 if(loadBlocked)return null;
 const r=readRaw();
 if(!r.ok||!r.raw)return null;
 try{
  const d=JSON.parse(r.raw);
  if(!validateImportedSave(d))return null;
  return JSON.stringify(d);
 }catch(e){return null}
}
function exportSave(){
 if(loadBlocked||activeSession())return;
 const r0=readRaw();
 if(!r0.ok||!r0.raw){toast('保存するデータがまだありません');return}
 try{
  const text=exportSaveJSON();
  if(text===null||typeof Blob==='undefined'||typeof URL==='undefined'){toast('保存に失敗しました');return}
  const blob=new Blob([text],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='eiken-town-save.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}},1000);
  toast('セーブファイルを保存しました');
 }catch(e){toast('保存に失敗しました')}
}
function validateImportedSave(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||d.v!==5)return null;
 if(!d.towns||typeof d.towns!=='object'||Array.isArray(d.towns))return null;
 const next={};
 for(const grade of Object.keys(d.towns)){
  if(!validGrade(grade))return null;
  const town=migrate(d.towns[grade],grade);
  if(!town)return null;
  next[grade]=town;
 }
 if(!Object.keys(next).length)return null;
 const ag=validGrade(d.activeGrade)&&next[d.activeGrade]?d.activeGrade:Object.keys(next)[0];
 return{activeGrade:ag,towns:next};
}
function importSaveFromText(text){
 if(loadBlocked||activeSession())return false;
 let d=null;
 try{d=JSON.parse(text)}catch(e){}
 const v=validateImportedSave(d);
 if(!v){toast('ファイルが正しくありません');return false}
 askYesNo('ファイルから読み込む?','今の全ての級の街・記録がファイルの内容で上書きされます。よろしいですか?','読み込む',()=>{
  if(loadBlocked||activeSession())return;
  towns=v.towns;activeGrade=v.activeGrade;legacyLoaded=false;
  state=towns[activeGrade]||freshState(activeGrade);
  freshStart=!towns[activeGrade];
  if(!persistTowns())return;
  clearGradeActivity();
  applyGfx();refreshHUD();refreshNameUI();renderStats();refreshGradeUI();
  show('scr-title');
  toast('セーブデータを読み込みました');
 });
 return true;
}
function importSave(file){
 if(loadBlocked||activeSession()||!file||typeof FileReader==='undefined')return;
 try{
  const reader=new FileReader();
  reader.onload=()=>importSaveFromText(reader.result);
  reader.onerror=()=>toast('ファイルが正しくありません');
  reader.readAsText(file);
 }catch(e){toast('ファイルが正しくありません')}
}

let actx=null;
function tone(f,dur,type,delay=0,vol=.12){try{const t=actx.currentTime+delay;const o=actx.createOscillator();const g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}}
function sfx(name){
 if(!state.sound)return;
 try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();
 if(name==='ok'){tone(660,.1,'sine');tone(880,.14,'sine',.09)}
 else if(name==='ng'){tone(200,.2,'square',0,.05);tone(160,.22,'square',.08,.05)}
 else if(name==='coin'){tone(1250,.06,'triangle');tone(1650,.12,'triangle',.06)}
 else if(name==='level'){[523,659,784,1047].forEach((f,i)=>tone(f,.13,'triangle',i*.09))}
 }catch(e){}
}

let voices=[],speechGeneration=0,pendingSpeech=null;
const HAS_TTS=!!window.speechSynthesis&&typeof window.speechSynthesis.speak==='function'&&typeof window.SpeechSynthesisUtterance==='function';
function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}}
if(HAS_TTS){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function speak(text,rate,speaker='narrator',token=speechGeneration){
 return new Promise(res=>{
  if(!HAS_TTS||token!==speechGeneration)return res(false);
  let timer=null,settled=false;
  const done=ok=>{
   if(settled)return;
   settled=true;clearTimeout(timer);
   if(pendingSpeech===done)pendingSpeech=null;
   res(ok);
  };
  pendingSpeech=done;
  try{
   const u=new SpeechSynthesisUtterance(text);
   const english=voices.filter(x=>/^en/i.test(x.lang));
   const index=speaker==='A'?0:speaker==='B'?1:2;
   if(english.length)u.voice=english[index%english.length];
   u.lang='en-US';u.rate=rate;u.pitch=[.9,1.2,1.05][index];
   u.onend=()=>done(true);u.onerror=()=>done(false);
   timer=setTimeout(()=>{done(false);try{speechSynthesis.cancel()}catch(e){}},Math.max(15000,String(text).length*150));
   speechSynthesis.speak(u);
  }catch(e){done(false)}
 });
}

function toast(msg){
 const el=document.createElement('div');
 el.className='toast';el.textContent=msg;
 $('#toast-root').appendChild(el);
 setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .4s'},1900);
 setTimeout(()=>el.remove(),2400);
}
function confetti(n){
 const em=['🎉','✨','🌸','⭐','💖','🎊'];
 for(let i=0;i<n;i++){
  const s=document.createElement('span');
  s.className='confetti';
  s.textContent=em[Math.floor(Math.random()*em.length)];
  s.style.left=Math.random()*100+'vw';
  s.style.animationDuration=(1.6+Math.random()*1.4)+'s';
  s.style.fontSize=(18+Math.random()*16)+'px';
  document.body.appendChild(s);
  setTimeout(()=>s.remove(),3200);
 }
}
let modalOpenedAt=0;
function openModal(html){$('#modal').innerHTML=html;modalOpenedAt=Date.now();$('#modal-root').classList.add('open')}
function closeModal(){$('#modal-root').classList.remove('open')}
$('#modal-root').addEventListener('click',e=>{if(e.target.id==='modal-root'&&Date.now()-modalOpenedAt>350)closeModal()});
function askYesNo(title,msg,yesLabel,onYes){
 openModal(`<h3>${title}</h3><p class="sub">${msg}</p>
 <div class="close-row">
 <button class="btn ghosty" id="yn-no">やめる</button>
 <button class="btn pinky" id="yn-yes">${yesLabel}</button></div>`);
 let settled=false;
 $('#yn-no').onclick=()=>{settled=true;closeModal()};
 $('#yn-yes').onclick=()=>{if(settled)return;settled=true;closeModal();onYes()};
}

function show(id){
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
 $('#'+id).classList.add('active');
 window.scrollTo(0,0);
 $('#appbar').classList.toggle('hidden',id==='scr-title');
 $('#home-btn').classList.toggle('hidden',id==='scr-title'||id==='scr-town');
 if(R.scene)R.renderVisible=(id==='scr-town');
}
function refreshHUD(){
 $('#coin-num').textContent=state.coins;
 $('#sound-btn').textContent=state.sound?'🔔':'🔕';
  refreshGradeUI();
}

let session=null;
let speechTimer=null;
function activeSession(){return session&&session.grade===state.grade&&!session.finished}
function stopSpeech(){
 speechGeneration++;
 clearTimeout(speechTimer);speechTimer=null;
 if(pendingSpeech)pendingSpeech(false);
 if(HAS_TTS){try{speechSynthesis.cancel()}catch(e){}}
}
function currentQuestion(s,i){return session===s&&activeSession()&&s.i===i&&!!s.qs[i]}
function canAnswer(s,i){return currentQuestion(s,i)&&!Object.hasOwn(s.results,i)}

function sumLevels(){return Object.entries(state.placed).filter(([c])=>c!=='review').reduce((s,[,p])=>s+p.level,0)}
function rankInfo(){
 const l=sumLevels();
 if(l>=14)return{e:'🏰',n:'えいご王国'};
 if(l>=9)return{e:'🌆',n:'きらめくシティ'};
 if(l>=4)return{e:'🏙️',n:'にぎやかな町'};
 return{e:'🏘️',n:'ちいさな村'};
}
function canUpgrade(cat){
 if(cat==='review')return false;
 if(!validCat(cat)||activeSession())return false;
 const p=state.placed[cat];
 if(!p||p.level>=3)return false;
 return state.progress[cat]>=LV_NEED[p.level]&&state.coins>=LV_COST[p.level];
}
function townNameText(){return state.townName||'ちいさな村'}
function refreshNameUI(){
 $('#town-name-label').textContent=townNameText();
}
function openNaming(isFirst){
 const sug=NAME_IDEAS.slice().sort(()=>Math.random()-.5).slice(0,3);
 openModal(`<h3>${isFirst?'🏙️ まちに名前をつけよう!':'✏️ まちの名前をかえる'}</h3>
 <p class="sub">${isFirst?'あなただけの街の名前を決めてね!<br class="wbr"><br class="mbr">(最大12文字・スキップもOK)':'新しい名前を入れてね!(最大12文字)'}</p>
 <input class="name-input" id="nm-input" maxlength="12" placeholder="例:サクラタウン">
 <div class="sugg" id="nm-sugg">${sug.map(n=>`<button data-n="${n}">${n}</button>`).join('')}</div>
 <div class="close-row">
 ${isFirst?'':'<button class="btn ghosty" onclick="closeModal()">やめる</button>'}
 <button class="btn minty big" id="nm-ok">きめる!</button></div>`);
 const inp=$('#nm-input');
 inp.value=state.townName||'';
 setTimeout(()=>inp.focus(),80);
 $('#nm-sugg').querySelectorAll('button').forEach(b=>{b.onclick=()=>{inp.value=b.dataset.n}});
 $('#nm-ok').onclick=()=>{
  if(loadBlocked)return;
  state.townName=inp.value.trim().slice(0,12);
  save();closeModal();refreshNameUI();
  if(isFirst){show('scr-town');renderMap();openTutorial()}
 };
 inp.onkeydown=e=>{if(e.key==='Enter')$('#nm-ok').click()};
}

const TUT=[
{e:'🏙️✨',t:'ようこそ!',d:'クイズに答えてコイン💰をためて、<br class="mbr">あなただけの街を大きくしよう!<br class="wbr"><br class="mbr">まちには6つの建物と、走る車もあるよ。'},
{e:'🏗️',t:'建物を建てよう',d:'左下の「🏗️ こうじする」をおすと<br class="mbr">建物がえらべるよ。<br class="wbr"><br class="mbr">建物をえらんだら、置きたい場所の地面を<br class="mbr">タップして決定!<br class="wbr">まずは無料の図書館📚と復習タワー🗼からどうぞ。'},
{e:'📝',t:'クイズに挑戦!',d:'建物をタップして「クイズをはじめる」!<br class="wbr"><br class="mbr">1回に5問、正解するたびに<br class="mbr">コイン💰がもらえるよ。<br class="wbr"><br class="mbr">まちがえた問題はじどうで<br class="mbr">ふくしゅうリストに入るので、<br class="mbr">🗼復習タワーを建てて復習しよう!'},
{e:'🛣️🚗',t:'道路をひこう',d:'道路は1マス💰10。<br class="wbr"><br class="mbr">建物のそばに道を通すと、<br class="mbr">クイズのごほうびコインがプラスされる!<br class="wbr"><br class="mbr">道がつながるとカラフルな車が走りだすよ。'},
{e:'⭐',t:'レベルアップで成長',d:'同じ建物で正解を重ねるとレベルアップ<br class="mbr">(Lv2は6問+💰40、Lv3は16問+💰100)。<br class="wbr"><br class="mbr">レベル3になると少し難しい練習問題が出るぞ!<br class="wbr"><br class="mbr">街が発展すると称号も変わるよ。'},
{e:'🖱️',t:'操作のかんばん',d:'ドラッグ=街をまわす/<br class="wbr"><br class="mbr">🖐️ボタン=移動モード<br class="wbr"><br class="mbr">(右ドラッグ・ピンチ2本指でも移動)/<br class="wbr"><br class="mbr">ホイール・ピンチ=ズーム/🎯=視点をもどす。<br class="wbr"><br class="mbr">右上の⚙️せっていから、<br class="mbr">効果音や「遊び方」をいつでも見られるよ!'}
];
let tutPage=0;
function openTutorial(){
 tutPage=0;
 renderTut();
}
function renderTut(){
 const p=TUT[tutPage];
 const last=tutPage===TUT.length-1; const body=tutPage===0?p.d.replace('6つの建物',countableBuildings(state.grade).length+'つの建物'):p.d;
 openModal(`<h3 style="font-size:52px;line-height:1.2;margin-bottom:2px">${p.e}</h3>
 <h3>${p.t}</h3>
  <p style="text-align:center;font-size:15.5px;line-height:2;font-weight:700;margin:12px auto 4px;max-width:36em">${body}${tutPage===2?'<br>'+flowerGuide(state.grade)+'<br>練習モードです。模擬試験や合格の保証ではありません。':''}</p>
 <div class="dots" style="justify-content:center;margin-top:14px">
 ${TUT.map((_,k)=>`<span class="dot ${k===tutPage?'now':(k<tutPage?' done-ok':'')}"></span>`).join('')}
 </div>
 <div class="close-row">
 <button class="btn ghosty small" id="tut-skip">スキップ</button>
 <button class="btn pinky big" id="tut-next">${last?'さあ、はじめよう!🎉':'つぎへ ▶'}</button>
 </div>`);
 $('#tut-next').onclick=()=>{
  if(last){closeModal();if($('#scr-town').classList.contains('active'))toast('街づくりの基本はOK!まずは図書館📚を建ててみよう!')}
  else{tutPage++;renderTut()}
 };
 $('#tut-skip').onclick=closeModal;
}

let pendingPlace=null;
let freshStart=false;

function catAt(t){return Object.keys(state.placed).find(c=>state.placed[c].tile===t)}
function onTileTap(t){
 if(!validTile(t)||activeSession())return;
 if(pendingPlace){
  if(pendingPlace==='__road'){tryRoad(t);return}
  const did=decoIdOf(pendingPlace);
  if(did){
   if(!validDeco(did)){exitPlace();return}
   if(decoAt(t)||catAt(t)||roads().includes(t)){toast('そこには置けないよ。別の場所にしてね');return}
   const d=D[did];
   askYesNo(`${d.emoji} ${d.name}`,`${d.desc}<br>この場所に置く?`,`💰${d.cost===0?'無料':d.cost}で ここに置く!`,()=>{if(pendingPlace==='deco:'+did)confirmDeco(t,did)});
   return;
  }
  if(decoAt(t)||catAt(t)||roads().includes(t)){toast('そこには建てられないよ。別の場所にしてね');return}
  const cat=pendingPlace;
  if(!validCat(cat)||!state.unlocked.includes(cat)||state.placed[cat]){exitPlace();return}
  const b=B[cat];
  askYesNo(`${b.emoji} ${b.name}`,`${buildingDesc(b.cat)}<br>この場所に建てる?`,`💰${b.cost===0?'無料':b.cost}で ここに建てる!`,()=>{if(pendingPlace===cat)confirmBuild(t,cat)});
  return;
 }
const cat=catAt(t);
if(cat==='review'){openReviewMenu();return}
if(cat)openBuildingMenu(cat);
 else if(roads().includes(t))openRemoval(t,'__road');
 else if(decoAt(t))openRemoval(t,'deco:'+decoAt(t).kind);
 else openPalette();
}
function openRemoval(t,cat){
 if(activeSession()||!validTile(t))return;
 const did=decoIdOf(cat);
 const road=cat==='__road';
 if(did){
  if(decoAt(t)?.kind!==did)return;
 }else if(road?!roads().includes(t):!validCat(cat)||state.placed[cat]?.tile!==t)return;
 const placed=!did&&!road?state.placed[cat]:null,owner=state;
 const name=road?ROAD.name:did?D[did].name:B[cat].name;
 const note=did?'コインは戻らないよ。':'コインは戻らないよ。学習の記録と解放した建物は残るよ。建て直すとレベル1になるよ。';
 askYesNo(`${name}を撤去する?`,note,'撤去する',()=>{
  if(activeSession()||state!==owner)return;
  if(road){
   if(!roads().includes(t))return;
   state.roads=roads().filter(tile=>tile!==t);
  }else if(did){
   if(decoAt(t)?.kind!==did)return;
   state.decorations=state.decorations.filter(d=>d.tile!==t);
  }else{
   if(state.placed[cat]!==placed)return;
   delete state.placed[cat];
  }
  save();renderMap();
 });
}
function neighborsRoad(t){
 const c=t%GRID,r=(t/GRID)|0,res=[];
 [[c,r-1],[c,r+1],[c-1,r],[c+1,r]].forEach(([x,y])=>{
  if(x>=0&&x<GRID&&y>=0&&y<GRID&&(state.roads||[]).includes(y*GRID+x))res.push(y*GRID+x);
 });
 return res;
}
function tryRoad(t){
 if(loadBlocked){toast('セーブデータの確認ができていないため、まだ操作できません');return}
 if(!validTile(t)||activeSession())return;
 if(catAt(t)){toast('建物の上には道はひけないよ!');return}
 if(decoAt(t)){toast('かざりの上には道はひけないよ!');return}
 if((state.roads||[]).includes(t)){toast('ここにはもう道があるよ');return}
 if(state.coins<ROAD.cost){toast('💰 コインが足りない…');exitPlace();return}
 state.coins-=ROAD.cost;
 if(!Array.isArray(state.roads))state.roads=[];
 state.roads.push(t);
 save();sfx('coin');
 if(R.ok){
  rebuildRoads();
  spawnCars();
  if(R.sun)R.sun.shadow.needsUpdate=true;
 }else{
  renderMap();
 }
 refreshHUD();
 refreshNameUI();
 renderStats();
}
function confirmBuild(t,cat){
 if(loadBlocked||activeSession()||!validTile(t)||!validCat(cat)||!state.unlocked.includes(cat))return;
 exitPlace();
 const b=B[cat];
 if(state.placed[cat]||catAt(t)||decoAt(t)||roads().includes(t)||state.coins<b.cost){toast(state.coins<b.cost?'💰 コインが足りない…':'そこには建てられないよ…');renderMap();return}
 state.coins-=b.cost;
 state.placed[cat]={tile:t,level:1};
 state.progress[cat]=state.progress[cat]||0;
 updateUnlocks(state);
 save();
 sfx('level');confetti(26);
 toast(`${b.emoji}${b.name}ができたよ!`);
 renderMap();
}
function confirmDeco(t,id){
 if(loadBlocked||activeSession()||!validTile(t)||!validDeco(id))return;
 exitPlace();
 const d=D[id];
 if(decoAt(t)||catAt(t)||roads().includes(t)||state.coins<d.cost){toast(state.coins<d.cost?'💰 コインが足りない…':'そこには置けないよ…');renderMap();return}
 state.coins-=d.cost;
 state.decorations.push({tile:t,kind:id});
 save();
 sfx('coin');confetti(12);
 toast(`${d.emoji}${d.name}を置いたよ!`);
 renderMap();
}
function enterPlace(cat){
 if(loadBlocked||activeSession())return;
 const did=decoIdOf(cat);
 if(did){if(!validDeco(did))return}
 else if(cat!=='__road'&&(!validCat(cat)||!state.unlocked.includes(cat)||state.placed[cat]))return;
 pendingPlace=cat;
 setPlaceBar(true);
 $('#build-open').classList.add('hidden');
 if(R.ok)setGhost(cat);
}
function exitPlace(){
 pendingPlace=null;
 setPlaceBar(false);
 $('#build-open').classList.remove('hidden');
 if(R.ok)setGhost(null);
}
function setPlaceBar(on){
 let bar=$('#place-bar');
  if(on){
   const did=decoIdOf(pendingPlace);
   const cfg=pendingPlace==='__road'?ROAD:did?D[did]:B[pendingPlace];
  const tip=pendingPlace==='__road'?'(続けてタップすればどんどんひけるよ!)':'';
  if(!bar){bar=document.createElement('div');bar.id='place-bar';bar.className='place-bar';$('#scene-wrap').appendChild(bar)}
  bar.innerHTML=`📍 <span class="place-emoji">${cfg.emoji}${cfg.name}</span><span class="place-tip"> を置く場所をタップ!${tip}</span><span class="place-tip-short"> をタップして置こう!</span> <button class="cancel" id="place-cancel">やめる</button>`;
  $('#place-cancel').onclick=e=>{e.stopPropagation();exitPlace()};
 }else if(bar)bar.remove();
 refreshSceneHint();
}
function openPalette(){
 if(loadBlocked||activeSession())return;
 exitPlace();closeModal();
 const items=BUILDINGS.filter(b=>!state.placed[b.cat]&&buildingGrades(b).includes(state.grade)).sort((a,b)=>a.cost-b.cost).map(b=>{
  const locked=!state.unlocked.includes(b.cat);
  const poor=state.coins<b.cost;
  const dis=locked||poor?'disabled':'';
  const why=locked?`🔒 ${(reqFor(b,state.grade)||B[b.req]||b).name}を先に建てよう`:poor?'💰 コインが足りない…':'タップして好きな場所へ!';
  return`<button class="bcard ${locked?'locked':''}" ${dis} data-cat="${b.cat}">
   <span class="bc-emoji">${b.emoji}</span>
   <span><span class="bc-name">${b.name}</span><br><span class="bc-desc">${buildingDesc(b.cat)}<br><small style="color:var(--lav-d);font-weight:700">${why}</small></span></span>
   <span class="bc-cost">${b.cost===0?'無料':'💰'+b.cost}</span></button>`;
 }).join('');
 const roadPoor=state.coins<ROAD.cost;
 const roadCard=`<button class="bcard" ${roadPoor?'disabled':''} data-cat="__road">
   <span class="bc-emoji">🛣️</span>
   <span><span class="bc-name">道路</span><br><span class="bc-desc">まちに道をひこう!<br><small style="color:var(--mint-d);font-weight:700">🚗 建物のそばに通すと、<br class="mbr">クイズのごほうびコインがプラスされるよ!</small></span></span>
   <span class="bc-cost">💰${ROAD.cost}/マス</span></button>`;
 const decoCards=DECOS.map(d=>{
  const poor=state.coins<d.cost;
  return`<button class="bcard" ${poor?'disabled':''} data-cat="deco:${d.id}">
   <span class="bc-emoji">${d.emoji}</span>
   <span><span class="bc-name">${d.name}</span><br><span class="bc-desc">${d.desc}<br><small style="color:var(--mint-d);font-weight:700">${poor?'💰 コインが足りない…':'タップして好きな場所へ!'}</small></span></span>
   <span class="bc-cost">💰${d.cost}</span></button>`;
 }).join('');
 openModal(`<h3>🏗️ 何を建てる?</h3><p class="sub">建物や道路をえらんで、好きな場所に置こう!</p>${items}${roadCard}
 <h3 style="margin-top:14px">🌼 かざり</h3><p class="sub">見た目だけ・効果なし。<br class="mbr">まちをかわいくデコレーションしよう!</p>${decoCards}
 <div class="close-row"><button class="btn ghosty" onclick="closeModal()">やめる</button></div>`);
 document.querySelectorAll('#modal .bcard:not(:disabled)').forEach(el=>{
  el.onclick=()=>{closeModal();enterPlace(el.dataset.cat)};
 });
}

const R={inited:false,ok:false,compiled:false,lastPtrUp:0,renderer:null,scene:null,camera:null,sun:null,renderVisible:false,tiles:[],city:null,roadsG:null,carsG:null,agents:[],clouds:[],anims:[],ghostLabel:null,ghostCat:null,hover:null,ray:null,ptr:null,cam:{theta:.78,phi:1.02,radius:32},target:{x:0,z:0},dragMode:'orbit'};
function isWebGLAvailable(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch(e){return false}}
function tileXY(t){const c=t%GRID,rw=Math.floor(t/GRID);return{x:(c-(GRID-1)/2)*PITCH,z:(rw-(GRID-1)/2)*PITCH}}
function updateCam(){
 const{theta,phi,radius}=R.cam;
 R.camera.position.set(
  R.target.x+radius*Math.sin(phi)*Math.sin(theta),
  radius*Math.cos(phi),
  R.target.z+radius*Math.sin(phi)*Math.cos(theta)
 );
 R.camera.lookAt(R.target.x,.4,R.target.z);
}
function panBy(dx,dy){
 const cp=R.camera.position;
 const fx=R.target.x-cp.x,fz=R.target.z-cp.z;
 const fl=Math.hypot(fx,fz)||1;
 const nx=fx/fl,nz=fz/fl;
 const rx=-nz,rz=nx;
 const k=R.cam.radius*.0016;
 const lim=PITCH*GRID/2;
 R.target.x=Math.max(-lim,Math.min(lim,R.target.x+(-rx*dx+nx*dy)*k));
 R.target.z=Math.max(-lim,Math.min(lim,R.target.z+(-rz*dx+nz*dy)*k));
 updateCam();
}
function refreshSceneHint(){
 const h=$('#scene-hint');
 if(!h)return;
 if(pendingPlace){
  h.textContent=pendingPlace==='__road'?'地面をタップして道路をひこう!':'地面をタップして建設場所をえらぼう!';
 }else{
  h.textContent=`🖱️ ドラッグ=${R.dragMode==='pan'?'移動':'まわす'}・ホイール/ピンチ=ズーム・右ドラッグ=いつでも移動・建物タップ=クイズ`;
 }
}
const MATS={};
function M(color,extra){
 let m=MATS[color];
 if(!m){m=new THREE.MeshLambertMaterial({color});MATS[color]=m}
 return m;
}
function box(w,h,d,color,x,y,z,g){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(color));m.position.set(x,y,z);m.castShadow=true;if(g)g.add(m);return m}
function pyr(size,h,color,x,y,z,g){const m=new THREE.Mesh(new THREE.ConeGeometry(size,h,4),M(color));m.rotation.y=Math.PI/4;m.position.set(x,y,z);m.castShadow=true;if(g)g.add(m);return m}
function cyl(rt,rb,h,color,x,y,z,g,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||14),M(color));m.position.set(x,y,z);m.castShadow=true;if(g)g.add(m);return m}
function sph(r,color,x,y,z,g){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,14),M(color));m.position.set(x,y,z);m.castShadow=true;if(g)g.add(m);return m}
function tree(x,z,s,g){cyl(.09*s,.11*s,.5*s,0x9a6b4f,x,.25*s,z,g,8);sph(.34*s,0x58c48d,x,.72*s,z,g);sph(.26*s,0x7fdcae,x+.16*s,.95*s,z,g)}
function flowerDot(x,z,color,g){cyl(.022,.022,.32,0x3f9d63,x,.16,z,g,6);sph(.09,color,x,.38,z,g)}

function cone(rt,h,color,x,y,z,g,seg){const m=new THREE.Mesh(new THREE.ConeGeometry(rt,h,seg||12),M(color));m.position.set(x,y,z);m.castShadow=true;if(g)g.add(m);return m}
function gable(w,hgt,depth,color,x,y,z,g){
 const slope=Math.atan2(hgt,w/2);
 const len=Math.hypot(hgt,w/2)+.03;
 const l=box(len,.1,depth,color,x-w/4-.005,y,z,g);l.rotation.z=slope;
 const r=box(len,.1,depth,color,x+w/4+.005,y,z,g);r.rotation.z=-slope;
}
const LABEL_Y={library:2.8,school:3.0,cafe:2.65,station:2.3,park:1.9,flower:2.4,essay:2.6,summary:2.7,review:3.9};

function makeBuilding(cat,level){
 const g=new THREE.Group();
 if(cat==='library'||cat==='school'||cat==='cafe'||cat==='flower'||cat==='essay'||cat==='summary')box(2.9,.12,2.9,0xf1e9d8,0,.06,0,g);
 if(cat==='library'){
  box(2.5,.12,.6,0xe3dcc9,0,.06,1.28,g);
  box(2.3,.12,.48,0xe9e2d0,0,.18,1.18,g);
  box(2.1,.12,.36,0xefe8d6,0,.30,1.08,g);
  box(2.4,.4,1.7,0xded5bf,0,.20,-.05,g);
  box(2.2,1.0,1.5,0xe7d5b0,0,.90,-.08,g);
  box(2.32,.14,1.62,0xe0d7c1,0,1.47,-.08,g);
  [-.78,-.26,.26,.78].forEach(x=>{cyl(.09,.10,.85,0xe9edf3,x,.82,1.02,g,12)});
  box(2.0,.18,.52,0xe9edf3,0,1.33,1.02,g);
  gable(2.0,.4,.54,0xf2a0bd,0,1.60,1.02,g);
  box(.46,.8,.08,0x8a6a4f,0,.80,1.04,g);
  [-1.13,1.13].forEach(x=>{
   [-.45,.25].forEach(z=>{box(.07,.5,.34,0x9adcf0,x,.95,z,g)});
  });
  cyl(.44,.47,.22,0xe8dfca,0,1.65,-.08,g,16);
  const dm=sph(.46,0xff9fb2,0,1.76,-.08,g);dm.scale.set(1,.72,1);
  cyl(.02,.02,.16,0xE8B84B,0,2.14,-.08,g,6);
  sph(.055,0xE8B84B,0,2.26,-.08,g);
  box(.92,.05,.64,0xd9577f,1.18,.20,1.18,g);
  const pl=box(.4,.05,.54,0xf6efdd,1.06,.27,1.18,g);pl.rotation.z=.48;
  const pr=box(.4,.05,.54,0xf6efdd,1.31,.27,1.18,g);pr.rotation.z=-.48;
  sph(.16,0x58c48d,-1.42,.16,1.3,g);
 }else if(cat==='school'){
  box(2.6,.24,1.7,0xcfc6ae,0,.12,0,g);
  box(2.25,1.5,1.15,0xf9e0a0,0,1.0,-.05,g);
  [.68,1.32].forEach(y=>{
   [-.78,0,.78].forEach(x=>{box(.26,.3,.06,0x9adcf0,x,y,.54,g)});
  });
  box(.4,.5,.07,0x8a6a4f,0,.33,.56,g);
  box(.85,.06,.4,0x7db9e8,0,.66,.74,g);
  box(.75,2.0,.95,0xfce8b0,1.18,1.0,-.02,g);
  box(.16,1.3,.06,0x9adcf0,1.18,1.05,.47,g);
  box(.83,.12,1.02,0xd9cdb0,1.18,2.06,-.02,g);
  box(2.31,.1,1.2,0xead9b5,0,1.8,-.05,g);
  [[-1.05,-.5],[1.05,-.5],[-1.05,.45],[1.05,.45]].forEach(([x,z])=>{cyl(.025,.025,.22,0x999999,x,1.96,z,g,6)});
  cyl(.03,.03,1.75,0xdddddd,-1.5,.99,.9,g,6);
  box(.48,.3,.03,0xe9edf3,-1.26,1.62,.9,g);
  const hi=sph(.085,0xff5a76,-1.26,1.62,.925,g);hi.scale.set(1,1,.35);
 }else if(cat==='cafe'){
  box(1.9,1.02,1.45,0xffdfae,0,.51,0,g);
  box(1.45,.46,.07,0xbfe3ff,0,.62,.73,g);
  [-.35,.35].forEach(x=>{box(.05,.46,.09,0xe9edf3,x,.62,.745,g)});
  box(.36,.58,.07,0x7a4a2f,.58,.29,.74,g);
  const aw=box(1.98,.1,.9,0xff8fae,0,1.08,.98,g);aw.rotation.x=.3;
  cyl(.27,.21,.42,0xefe6d4,-.38,1.52,0,g,14);
  cyl(.235,.235,.06,0x6b4023,-.38,1.74,0,g,14);
  const hd=new THREE.Mesh(new THREE.TorusGeometry(.11,.04,8,16),M(0xefe6d4));
  hd.position.set(-.06,1.52,0);hd.castShadow=true;g.add(hd);
  sph(.05,0xffffff,-.46,1.94,0,g);sph(.035,0xffffff,-.34,2.04,0,g);
  cyl(.035,.035,.95,0xdad2c8,-1.05,.48,1.02,g,8);
  cone(.55,.32,0xff9fb2,-1.05,1.1,1.02,g,10);
  cyl(.26,.26,.05,0xe9edf3,-1.05,.5,1.02,g,14);
  cyl(.04,.04,.45,0xdad2c8,-1.05,.23,1.02,g,8);
  cyl(.028,.028,.75,0xdad2c8,1.28,.38,-.88,g,8);
  cone(.42,.26,0xffd166,1.28,.82,-.88,g,10);
  const cb=box(.34,.46,.05,0x5a4636,1.05,.4,1.14,g);cb.rotation.x=-.18;
  const bd=box(.26,.36,.05,0x3a3a3a,1.05,.41,1.165,g);bd.rotation.x=-.18;
 }else if(cat==='station'){
  box(2.7,.08,.62,0xbdb6ac,0,.04,-.35,g);
  [-.5,-.2].forEach(z=>{box(2.7,.04,.05,0x8a8a8a,0,.1,z,g)});
  box(1.5,.5,.56,0xff8fa3,-.15,.47,-.35,g);
  box(.42,.44,.54,0xffb1c1,.82,.45,-.35,g);
  box(.06,.2,.4,0xbfe3ff,1.04,.55,-.35,g);
  box(1.95,.13,.58,0xdfe9f2,-.05,.52,-.35,g);
  box(1.15,.19,.58,0x4a4a55,-.25,.68,-.35,g);
  [[-.5],[.45]].forEach(([x])=>{
   [-.53,-.17].forEach(z=>{const w=cyl(.12,.12,.07,0x3a3a3a,x,.12,z,g,10);w.rotation.x=Math.PI/2});
  });
  sph(.05,0xfff3a6,1.06,.36,-.5,g);sph(.05,0xfff3a6,1.06,.36,-.2,g);
  box(2.6,.16,.85,0xd8d3cb,0,.08,.68,g);
  [-.95,0,.95].forEach(x=>{cyl(.05,.05,1.0,0xf5f2ea,x,.66,.9,g,8)});
  box(2.3,.09,.8,0x7db9e8,0,1.2,.75,g);
  [.55,-.15].forEach(x=>{box(.5,.07,.2,0xc9986a,x,.27,.55,g)});
  box(.95,.8,.75,0xf3efe6,-.85,.4,-.9,g);
  gable(1.05,.3,.85,0xff9fb0,-.85,.97,-.9,g);
  box(.26,.42,.06,0x9a7b5f,-.85,.27,-.51,g);
  sph(.09,0xffffff,-.4,.72,-.51,g);
 }else if(cat==='park'){
  cyl(.66,.66,.06,0xdff0f8,-.5,.03,.42,g,20);
  cyl(.58,.58,.1,0x7fc4ee,-.5,.06,.42,g,20);
  sph(.1,0xffffff,-.62,.17,.5,g);
  sph(.06,0xffffff,-.5,.27,.5,g);
  box(.06,.03,.04,0xff9f43,-.43,.26,.5,g);
  cyl(.42,.46,.16,0xe8e2d6,0,.08,-.05,g,16);
  cyl(.35,.35,.04,0x9adcf0,0,.15,-.05,g,16);
  cyl(.07,.09,.26,0xe8e2d6,0,.27,-.05,g,10);
  cyl(.2,.24,.07,0xe8e2d6,0,.43,-.05,g,14);
  sph(.08,0x9adcf0,0,.55,-.05,g);
  sph(.035,0x9adcf0,.13,.47,.05,g);sph(.035,0x9adcf0,-.12,.47,-.15,g);
  tree(.9,.6,1.05,g);tree(-.95,-.55,1.2,g);
  box(.4,.06,.4,0xc9986a,.9,.55,-.6,g);
  [[.72,-.78],[1.08,-.78],[.72,-.42],[1.08,-.42]].forEach(([x,z])=>{cyl(.03,.03,.55,0x8a8a8a,x,.28,z,g,6)});
  [[.3],[.45],[.6]].forEach(([y])=>{box(.36,.045,.045,0x8a8a8a,.9,y,-.85,g)});
  const ch=box(.34,.05,.8,0xff6f91,.9,.3,-.1,g);ch.rotation.x=.6;
  cyl(.03,.03,.9,0x8a8a8a,-1.25,.45,-.6,g,6);cyl(.03,.03,.9,0x8a8a8a,-.85,.45,-.6,g,6);
  box(.5,.05,.06,0x8a8a8a,-1.05,.93,-.6,g);
  box(.18,.04,.24,0xffd166,-1.05,.4,-.6,g);
  cyl(.012,.012,.5,0xdddddd,-1.13,.66,-.6,g,6);cyl(.012,.012,.5,0xdddddd,-.97,.66,-.6,g,6);
  flowerDot(-.2,.78,0xff6f91,g);flowerDot(.05,.84,0xffd166,g);flowerDot(.32,.78,0xb79cff,g);
 }else if(cat==='flower'){
  box(1.6,1.0,1.3,0xffc9dd,0,.5,-.25,g);
  pyr(1.22,.6,0xff9fc0,0,1.3,-.25,g);
  box(.34,.52,.07,0x9a6b4f,0,.26,.42,g);
  box(.46,.38,.06,0xf6d9e6,-.5,.56,.43,g);
  box(1.5,.18,.32,0x9a6b4f,0,.14,.6,g);
  flowerDot(-.55,.6,0xff6f91,g);flowerDot(-.2,.6,0xffd166,g);flowerDot(.15,.6,0xb79cff,g);flowerDot(.5,.6,0xff8fa3,g);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(.95,.7,.85),new THREE.MeshLambertMaterial({color:0xbfe6ff,transparent:true,opacity:.4}));
  glass.position.set(1.12,.37,-.2);g.add(glass);
  [[.675,-.58],[1.565,-.58],[.675,.18],[1.565,.18]].forEach(([x,z])=>{box(.05,.74,.05,0xe9edf3,x,.37,z,g)});
  gable(1.0,.26,.95,0xd6ecfa,1.12,.72,-.2,g);
  box(.8,.04,.3,0xe9edf3,1.12,.32,-.2,g);
  sph(.06,0xff6f91,.98,.38,-.28,g);sph(.06,0xffd166,1.12,.38,-.12,g);sph(.06,0xb79cff,1.27,.38,-.25,g);
  cyl(.03,.03,.55,0x8a8a8a,-1.0,.28,.62,g,6);
  sph(.11,0xff6f91,-1.0,.62,.62,g);sph(.1,0xffd166,-.87,.58,.62,g);sph(.09,0xb79cff,-1.13,.57,.62,g);
 }else if(cat==='essay'){
  box(2.2,1.1,1.6,0xf3e5c8,0,.55,-.1,g);
  pyr(1.75,.55,0x7fb4e8,0,1.38,-.1,g);
  box(.5,.62,.06,0x8a6a4f,-.6,.43,.72,g);
  box(1.1,.12,.9,0x9a6b4f,.25,.78,.35,g);
  [-.45,.95].forEach(x=>{[-.05,.75].forEach(z=>{box(.1,.66,.1,0x9a6b4f,x,.45,z,g)})});
  const paper=box(.8,.02,.6,0xfffdf5,.25,.86,.35,g);paper.rotation.y=.2;
  const pencil=cyl(.05,.05,1.0,0xe8a913,.75,1.0,.1,g,6);pencil.rotation.z=1.1;
  cone(.05,.12,0xff8fa3,1.18,.82,-.08,g,6);
  box(.5,.7,.3,0xb08968,-.95,.47,-.75,g);
  [.25,.45,.65].forEach(y=>{box(.44,.05,.26,0xff6f91,-.95,y,-.75,g)});
  cyl(.09,.11,.22,0x3a3a55,.75,.2,-.5,g,10);
  tree(1.25,.5,.7,g);
 }else if(cat==='summary'){
  box(2.0,1.6,1.4,0xe8e4f2,0,.8,-.1,g);
  pyr(1.6,.5,0x7f9fd0,0,1.85,-.1,g);
  box(1.2,.4,.06,0xfffdf5,0,1.15,.63,g);
  box(.9,.08,.07,0xff8fa3,0,1.08,.64,g);
  box(.9,.08,.07,0x7fdcae,0,1.22,.64,g);
  box(.36,.6,.07,0x8a6a4f,0,.36,.62,g);
  [-.7,.7].forEach(x=>{box(.3,.36,.06,0x9adcf0,x,.95,.61,g)});
  cyl(.16,.16,.06,0xfffdf5,-.6,1.7,.62,g,16);
  cyl(.02,.02,.1,0x3a3a55,-.6,1.73,.65,g,6);
  [.3,.55,.8].forEach((y,i)=>{box(.5,.09,.4,[0xff8fa3,0xffd166,0x9adcf0][i],.95,y,-.7,g)});
  tree(-1.15,.35,.75,g);
 }else if(cat==='review'){
  box(2.0,.2,2.0,0xd8d3cb,0,.1,0,g);
  [[-.7,-.7,.12,.12],[.7,-.7,-.12,.12],[-.7,.7,.12,-.12],[.7,.7,-.12,-.12]].forEach(([x,z,rz,rx])=>{
   const leg=box(.22,1.0,.22,0xf5532e,x,.6,z,g);leg.rotation.z=rz;leg.rotation.x=rx;
  });
  box(1.5,.45,1.5,0xfffdf5,0,.85,0,g);
  box(1.15,.45,1.15,0xf5532e,0,1.3,0,g);
  box(1.45,.22,1.45,0xf5532e,0,1.62,0,g);
  box(1.47,.1,1.47,0xfffdf5,0,1.62,0,g);
  box(.8,.5,.8,0xfffdf5,0,2.0,0,g);
  box(.55,.45,.55,0xf5532e,0,2.45,0,g);
  box(.85,.18,.85,0xf5532e,0,2.75,0,g);
  box(.87,.08,.87,0xfffdf5,0,2.75,0,g);
  cyl(.04,.09,.9,0xf5532e,0,3.25,0,g,8);
  sph(.07,0xff3b30,0,3.72,0,g);
  box(.6,.4,.06,0xfffdf5,0,.5,1.02,g);
  box(.44,.07,.07,0xff8fa3,0,.46,1.03,g);
  box(.44,.07,.07,0x7fdcae,0,.58,1.03,g);
  tree(1.2,.5,.7,g);flowerDot(-1.0,-.7,0xff6f91,g);
 }
 if(level>=2)box(2.35,.1,2.1,0xffd166,0,cat==='park'?.09:.17,0,g);
 if(level>=3){
  cyl(.035,.035,1.1,0x8a8a8a,1.0,1.85,-.6,g,6);
  box(.55,.3,.05,0xe8590c,1.28,2.25,-.6,g);
  sph(.09,0xffd166,1.0,2.45,-.6,g);
 }
 return g;
}
function makeDeco(kind){
 const g=new THREE.Group();
 if(kind==='flowerbed'){
  box(1.7,.28,1.1,0x8a6a4f,0,.14,0,g);
  box(1.5,.3,.9,0x5f4a38,0,.16,0,g);
  flowerDot(-.55,0,0xff6f91,g);flowerDot(-.18,.12,0xffd166,g);flowerDot(.18,-.1,0xb79cff,g);flowerDot(.55,.05,0xff8fa3,g);
  tree(-1.05,0,.55,g);
 }else if(kind==='bench'){
  [-.55,.55].forEach(x=>{box(.12,.45,.5,0x7a5c44,x,.225,0,g)});
  box(1.4,.1,.55,0xc9986a,0,.5,0,g);
  [-.55,.55].forEach(x=>{box(.12,.55,.1,0x7a5c44,x,.78,-.24,g)});
  const back=box(1.4,.4,.08,0xc9986a,0,.95,-.26,g);back.rotation.x=-.12;
  tree(1.0,-.3,.6,g);
 }else if(kind==='fountain'){
  cyl(.95,1.05,.3,0xd8d3cb,0,.15,0,g,20);
  cyl(.8,.8,.12,0x9adcf0,0,.36,0,g,20);
  cyl(.14,.18,.9,0xe8e2d6,0,.75,0,g,12);
  cyl(.42,.42,.1,0xe8e2d6,0,1.2,0,g,16);
  cyl(.34,.34,.06,0x9adcf0,0,1.26,0,g,16);
  sph(.09,0x9adcf0,0,1.42,0,g);
 }else if(kind==='lamp'){
  cyl(.3,.36,.12,0x8a8a8a,0,.06,0,g,10);
  cyl(.06,.08,1.9,0x5a5a66,0,1.0,0,g,8);
  box(.5,.08,.08,0x5a5a66,.2,1.95,0,g);
  sph(.13,0xffe9a3,.42,1.85,0,g);
  cone(.16,.12,0x8a8a8a,.42,2.0,0,g,8);
 }else if(kind==='swing'){
  [-.7,.7].forEach(x=>{cyl(.05,.05,1.6,0x6b8cae,x,.8,0,g,8)});
  box(1.6,.08,.08,0x6b8cae,0,1.6,0,g);
  [-.3,.3].forEach(x=>{cyl(.015,.015,.8,0x8a8a8a,x,1.15,0,g,6)});
  box(.75,.06,.3,0xc9986a,0,.72,0,g);
  tree(1.05,.4,.55,g);
 }else if(kind==='mailbox'){
  cyl(.06,.06,1.0,0x5a5a66,0,.5,0,g,8);
  box(.5,.4,.35,0xe05a5a,0,1.2,0,g);
  box(.56,.08,.41,0xb84545,0,1.43,0,g);
  box(.3,.06,.02,0xfffdf5,0,1.25,.19,g);
  flowerDot(-.5,-.4,0xff6f91,g);flowerDot(.5,-.4,0xffd166,g);
 }else if(kind==='clocktower'){
  box(1.2,.3,1.2,0xd8d3cb,0,.15,0,g);
  box(.8,1.4,.8,0xf3e5c8,0,1.0,0,g);
  pyr(.68,.5,0x7fb9e8,0,2.0,0,g);
  const face=cyl(.25,.25,.06,0xfffdf5,0,1.45,.42,g,20);face.rotation.x=Math.PI/2;
  box(.03,.16,.02,0x3a3a55,0,1.49,.46,g);
  const hand=box(.12,.03,.02,0x3a3a55,-.04,1.45,.46,g);hand.rotation.z=.5;
 }else if(kind==='busstop'){
  [-.5,.5].forEach(x=>{cyl(.04,.04,1.5,0x5a5a66,x,.75,-.2,g,8)});
  box(1.3,.06,.7,0x7fb9e8,0,1.53,-.05,g);
  cyl(.05,.05,1.9,0x5a5a66,-.45,.95,.3,g,8);
  box(.5,.35,.06,0x5a9bd5,-.45,1.6,.3,g);
  box(.34,.1,.07,0xfffdf5,-.45,1.6,.3,g);
  box(.8,.08,.3,0xc9986a,.1,.45,-.1,g);
 }else{
  [-.4,.4].forEach(x=>{cyl(.05,.05,1.0,0x9a6b4f,x,.5,0,g,8)});
  box(1.2,.6,.08,0xffdfae,0,.95,0,g);
  box(1.2,.12,.09,0xff8fae,0,1.28,0,g);
  box(.9,.3,.09,0xbfe3ff,0,.9,0,g);
 }
 return g;
}
function disposeObj(o){
 const shared=new Set([...Object.values(MATS),...Object.values(ROADMATS||{})]);
 o.traverse(c=>{
  if(c.geometry)c.geometry.dispose();
  if(c.material){
   (Array.isArray(c.material)?c.material:[c.material]).forEach(m=>{
    if(m.map&&m.map.dispose)m.map.dispose();
    if(!shared.has(m)&&m.dispose)m.dispose();
   });
  }
 });
}
function makeLabel(cat,level,noStars){
 const cv=document.createElement('canvas');cv.width=256;cv.height=170;
 const ctx=cv.getContext('2d');
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='96px sans-serif';ctx.fillText(B[cat].emoji,128,60);
 if(!noStars){ctx.font='40px sans-serif';ctx.fillText('⭐'.repeat(level),128,138)}
 const tex=new THREE.CanvasTexture(cv);
 if(THREE.sRGBEncoding)tex.encoding=THREE.sRGBEncoding;
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
 sp.scale.set(noStars?1.8:2.4,noStars?1.2:1.6,1);
 sp.position.y=noStars?2.0:2.55;
 return sp;
}
function setGhost(cat){
 if(R.ghostLabel){R.scene.remove(R.ghostLabel);disposeObj(R.ghostLabel);R.ghostLabel=null}
 R.ghostCat=cat;
 if(cat&&cat!=='__road'&&!decoIdOf(cat)){
  R.ghostLabel=makeLabel(cat,1,true);
  R.ghostLabel.visible=false;
  R.scene.add(R.ghostLabel);
 }
}
function makeCloud(){
 const g=new THREE.Group();
 const mat=M(0xffffff);
 for(let i=0;i<3;i++){
  const s=new THREE.Mesh(new THREE.SphereGeometry(.5+Math.random()*.4,8,8),mat);
  s.position.set(i*.7-.7,(i%2)*.16,0);
  s.castShadow=false;
  g.add(s);
 }
 g.position.set(-22-Math.random()*10,7.5+Math.random()*3,-11+Math.random()*22);
 g.userData.speed=1.6+Math.random()*2.2;
 R.scene.add(g);
 return g;
}
function clearGroup(g){
 while(g.children.length){const c=g.children.pop();disposeObj(c);g.remove(c)}
}
function rebuildCity(){
 R.anims=[];
 if(!R.ok)return;
 clearGroup(R.city);
 Object.entries(state.placed).forEach(([cat,p])=>{
  if(!B[cat]||!buildingGrades(B[cat]).includes(state.grade))return;
  const g=makeBuilding(cat,p.level);
  const{x,z}=tileXY(p.tile);
  g.position.set(x,0,z);
  const lb=makeLabel(cat,p.level,false);
  lb.position.y=LABEL_Y[cat]||2.55;
  g.add(lb);
  R.city.add(g);
  g.scale.set(.01,.01,.01);
  R.anims.push({obj:g,t:0});
 });
 (state.decorations||[]).forEach(d=>{
  const g=makeDeco(d.kind);
  const{x,z}=tileXY(d.tile);
  g.position.set(x,0,z);
  R.city.add(g);
  g.scale.set(.01,.01,.01);
  R.anims.push({obj:g,t:0});
 });
 rebuildRoads();
 spawnCars();
 if(R.sun)R.sun.shadow.needsUpdate=true;
}
let ROADMATS=null;
function roadMats(){
 if(!ROADMATS)ROADMATS={curb:M(0xcfc9bf,{roughness:1}),asp:M(0x6e6a75,{roughness:.95}),stripe:M(0xffffff)};
 return ROADMATS;
}
function rebuildRoads(){
 if(!R.roadsG)return;
 while(R.roadsG.children.length){
  const c=R.roadsG.children.pop();
  if(c.geometry)c.geometry.dispose();
  if(c.dispose)c.dispose();
 }
 const rd=state.roads||[];
 if(!rd.length)return;
 const rdSet=new Set(rd);
 const mats=roadMats();
 const dummy=new THREE.Object3D();
 const curb=new THREE.InstancedMesh(new THREE.BoxGeometry(TILE*.96,.1,TILE*.96),mats.curb,rd.length);
 const asp=new THREE.InstancedMesh(new THREE.BoxGeometry(TILE*.82,.08,TILE*.82),mats.asp,rd.length);
 curb.receiveShadow=true;
 asp.receiveShadow=true;
 let sc=0;
 rd.forEach(t=>{
  const c=t%GRID,r=(t/GRID)|0;
  if(r>0&&rdSet.has((r-1)*GRID+c))sc++;
  if(r<GRID-1&&rdSet.has((r+1)*GRID+c))sc++;
  if(c>0&&rdSet.has(r*GRID+c-1))sc++;
  if(c<GRID-1&&rdSet.has(r*GRID+c+1))sc++;
 });
 let stripes=null,ci=0;
 if(sc>0){
  stripes=new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.03,TILE*.36),mats.stripe,sc);
 }
 rd.forEach((t,i)=>{
  const{x,z}=tileXY(t);
  dummy.rotation.set(0,0,0);
  dummy.position.set(x,.05,z);
  dummy.updateMatrix();
  curb.setMatrixAt(i,dummy.matrix);
  dummy.position.set(x,.10,z);
  dummy.updateMatrix();
  asp.setMatrixAt(i,dummy.matrix);
  const c=t%GRID,r=(t/GRID)|0;
  const add=(side,ox,oz)=>{
   dummy.position.set(x+ox,.15,z+oz);
   dummy.rotation.set(0,side?Math.PI/2:0,0);
   dummy.updateMatrix();
   stripes.setMatrixAt(ci++,dummy.matrix);
  };
  if(r>0&&rdSet.has((r-1)*GRID+c))add(false,0,-TILE*.27);
  if(r<GRID-1&&rdSet.has((r+1)*GRID+c))add(false,0,TILE*.27);
  if(c>0&&rdSet.has(r*GRID+c-1))add(true,-TILE*.27,0);
  if(c<GRID-1&&rdSet.has(r*GRID+c+1))add(true,TILE*.27,0);
 });
 [curb,asp,stripes].forEach(m=>{
  if(!m)return;
  m.instanceMatrix.needsUpdate=true;
  m.frustumCulled=false;
  freeze(m);
  R.roadsG.add(m);
 });
}
function makeCar(col){
 const g=new THREE.Group();
 box(.6,.22,.38,col,0,.2,0,g);
 box(.32,.16,.34,0xffffff,-.05,.38,0,g);
 [[-.18],[.18]].forEach(([x])=>{
  [-.21,.21].forEach(z=>{
   const w=cyl(.09,.09,.06,0x333333,x,.09,z,g,10);
   w.rotation.x=Math.PI/2;
  });
 });
 g.traverse(o=>{o.castShadow=false;o.receiveShadow=false});
 g.scale.set(1.35,1.35,1.35);
 return g;
}
function spawnCars(){
 while(R.carsG.children.length){const c=R.carsG.children.pop();disposeObj(c)}
 R.agents=[];
 const rd=state.roads||[];
 if(rd.length<2)return;
 const n=Math.min(4,Math.max(1,Math.floor(rd.length/3)));
 const cols=[0xff6f91,0x63c7ff,0xffd166,0x7fdcae];
 for(let i=0;i<n;i++){
  const from=rd[Math.floor(Math.random()*rd.length)];
  const nbs=neighborsRoad(from);
  if(!nbs.length)continue;
  const to=nbs[Math.floor(Math.random()*nbs.length)];
  const mesh=makeCar(cols[R.agents.length%cols.length]);
  const f=tileXY(from),tt=tileXY(to);
  mesh.rotation.y=Math.atan2(-(tt.z-f.z),(tt.x-f.x));
  R.carsG.add(mesh);
  R.agents.push({mesh,fromTile:from,toTile:to,fx:f.x,fz:f.z,tx:tt.x,tz:tt.z,p:Math.random()*.8,speed:1.1+Math.random()*.9});
 }
}
function initThree(){
 if(R.inited)return;
 R.inited=true;
 const host=$('#scene-canvas-host');
 host.innerHTML='';
 try{
  const w=Math.max(host.clientWidth,50),h=Math.max(host.clientHeight,50);
  R.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  R.renderer.setClearColor(0xcfeeff);
  R.renderer.setPixelRatio(state.lowGfx?1:Math.min(window.devicePixelRatio||1,1.5));
  R.renderer.setSize(w,h);
  R.renderer.shadowMap.enabled=true;
  R.renderer.shadowMap.type=THREE.PCFShadowMap;
  if(THREE.sRGBEncoding)R.renderer.outputEncoding=THREE.sRGBEncoding;
  host.appendChild(R.renderer.domElement);
  R.scene=new THREE.Scene();
  R.camera=new THREE.PerspectiveCamera(45,w/h,.1,200);
  R.ray=new THREE.Raycaster();
  R.ptr=new THREE.Vector2();
  updateCam();
  R.scene.add(new THREE.HemisphereLight(0xffffff,0xcdebd6,.8));
  const sun=new THREE.DirectionalLight(0xfff2d9,.85);
  sun.position.set(9,14,7);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.autoUpdate=false;
  sun.shadow.needsUpdate=true;
  R.sun=sun;
  R.scene.add(sun);
  const base=new THREE.Mesh(new THREE.BoxGeometry(PITCH*GRID+.9,.5,PITCH*GRID+.9),M(0x4f9a64,{roughness:1}));
  base.position.y=-.32;
  base.receiveShadow=true;
  freeze(base);
  R.scene.add(base);
  const tgeo=new THREE.BoxGeometry(TILE,.22,TILE);
  const tm=new THREE.InstancedMesh(tgeo,new THREE.MeshLambertMaterial({color:0xffffff}),GRID*GRID);
  tm.receiveShadow=true;
  tm.frustumCulled=false;
  const dummy=new THREE.Object3D();
  const col=new THREE.Color();
  for(let t=0;t<GRID*GRID;t++){
   const{x,z}=tileXY(t);
   dummy.position.set(x,-.05,z);
   dummy.rotation.set(0,0,0);
   dummy.updateMatrix();
   tm.setMatrixAt(t,dummy.matrix);
   tm.setColorAt(t,col.setHex(t%2?0x7cc98f:0x8fd6a2));
  }
  tm.instanceMatrix.needsUpdate=true;
  if(tm.instanceColor)tm.instanceColor.needsUpdate=true;
  freeze(tm);
  R.scene.add(tm);
  R.tiles=tm;
  R.hover=new THREE.Mesh(new THREE.BoxGeometry(TILE*.98,.08,TILE*.98),new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.9}));
  R.hover.visible=false;
  R.scene.add(R.hover);
  R.city=new THREE.Group();
  R.scene.add(R.city);
  R.roadsG=new THREE.Group();
  R.scene.add(R.roadsG);
  R.carsG=new THREE.Group();
  R.scene.add(R.carsG);
  for(let i=0;i<3;i++)R.clouds.push(makeCloud());
  bindSceneEvents();
  window.addEventListener('resize',onResize);
  R.ok=true;
  requestAnimationFrame(loop);
 }catch(e){R.ok=false}
}
function onResize(){
 if(!R.ok)return;
 const host=$('#scene-canvas-host');
 const w=host.clientWidth,h=host.clientHeight;
 if(w<10||h<10)return;
 R.camera.aspect=w/h;
 R.camera.updateProjectionMatrix();
 R.renderer.setSize(w,h);
}
let lastFrame=0;
function loop(t){
 if(!R.ok)return;
 requestAnimationFrame(loop);
 if(!R.renderVisible)return;
 if(t-lastFrame<33)return;
 lastFrame=t;
 R.clouds.forEach(c=>{
  c.position.x+=c.userData.speed*.033;
  if(c.position.x>24)c.position.x=-26;
 });
 for(let i=R.anims.length-1;i>=0;i--){
  const a=R.anims[i];
  a.t+=.033;
  const k=Math.min(1,a.t/.55);
  const c1=1.70158,c3=c1+1;
  const e=1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2);
  const s=k>=1?1:Math.max(.01,e);
  a.obj.scale.set(s,s,s);
  if(k>=1){
   a.obj.scale.set(1,1,1);
   freeze(a.obj);
   R.anims.splice(i,1);
  }
 }
 R.agents.forEach(a=>{
  a.p+=.033*a.speed;
  if(a.p>=1){
   const opts=neighborsRoad(a.toTile).filter(t=>t!==a.fromTile);
   if(opts.length){
    const nt=opts[Math.floor(Math.random()*opts.length)];
    a.fromTile=a.toTile;a.toTile=nt;a.p=0;
    const f=tileXY(a.fromTile),tt=tileXY(a.toTile);
    a.fx=f.x;a.fz=f.z;a.tx=tt.x;a.tz=tt.z;
    a.mesh.rotation.y=Math.atan2(-(tt.z-f.z),(tt.x-f.x));
   }else{
    a.p=.995;
   }
  }
  const kk=Math.min(a.p,.999);
  a.mesh.position.set(a.fx+(a.tx-a.fx)*kk,.02,a.fz+(a.tz-a.fz)*kk);
 });
 R.renderer.render(R.scene,R.camera);
}
function freeze(o){
 o.traverse(c=>{c.matrixAutoUpdate=false;c.updateMatrix()});
}
function pickTile(e){
 if(!R.tiles)return null;
 const rect=R.renderer.domElement.getBoundingClientRect();
 R.ptr.x=((e.clientX-rect.left)/rect.width)*2-1;
 R.ptr.y=-((e.clientY-rect.top)/rect.height)*2+1;
 R.ray.setFromCamera(R.ptr,R.camera);
 const hits=R.ray.intersectObject(R.tiles);
 if(!hits.length)return null;
 const h=hits[0];
 return h.object.isInstancedMesh?h.instanceId:h.object.userData.tile;
}
function handleHover(e){
 const t=pickTile(e);
 if(t==null){R.hover.visible=false;if(R.ghostLabel)R.ghostLabel.visible=false;return}
 const occupied=!!catAt(t);
 const{x,z}=tileXY(t);
 R.hover.position.set(x,.14,z);
 R.hover.visible=!occupied;
 R.hover.material.color.setHex(occupied?0xff8888:(pendingPlace?0xffd166:0x9adcf0));
 if(R.ghostLabel){
  R.ghostLabel.position.set(x,1.9,z);
  R.ghostLabel.visible=!occupied&&!!pendingPlace;
 }
}
function handleTap(e){
 const t=pickTile(e);
 if(t!=null)onTileTap(t);
}
function bindSceneEvents(){
 const el=R.renderer.domElement;
 const ptrs=new Map();
 R.clearPointers=()=>ptrs.clear();
 let downInfo=null,lastPinch=0,lastMid=null;
 el.addEventListener('contextmenu',e=>e.preventDefault());
 el.addEventListener('pointerdown',e=>{
  try{el.setPointerCapture(e.pointerId)}catch(err){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,btn:e.button});
  if(ptrs.size===1)downInfo={sx:e.clientX,sy:e.clientY,btn:e.button};
  if(ptrs.size===2){
   const[a,b]=[...ptrs.values()];
   lastPinch=Math.hypot(a.x-b.x,a.y-b.y);
   lastMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   downInfo=null;
  }
 });
 el.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){handleHover(e);return}
  const p=ptrs.get(e.pointerId);
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
   if(ptrs.size===1&&downInfo){
    if(downInfo.btn===2||R.dragMode==='pan')panBy(dx,dy);
   else{
    R.cam.theta-=dx*.0055;
    R.cam.phi=Math.min(1.32,Math.max(.32,R.cam.phi-dy*.0045));
    updateCam();
   }
  }else if(ptrs.size===2){
   const[a,b]=[...ptrs.values()];
   const dnow=Math.hypot(a.x-b.x,a.y-b.y);
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   if(lastMid)panBy(mx-lastMid.x,my-lastMid.y);
   if(lastPinch>0&&dnow>0)R.cam.radius=Math.min(42,Math.max(10,R.cam.radius*lastPinch/dnow));
   lastPinch=dnow;lastMid={x:mx,y:my};
   updateCam();
  }
 });
 const up=e=>{
  ptrs.delete(e.pointerId);
  R.lastPtrUp=Date.now();
  if(ptrs.size<2){lastMid=null;lastPinch=0}
  if(ptrs.size===0&&downInfo){
   const dist=Math.hypot(e.clientX-downInfo.sx,e.clientY-downInfo.sy);
   if(dist<12)handleTap(e);
   downInfo=null;
  }
 };
 el.addEventListener('pointerup',up);
 el.addEventListener('pointercancel',up);
 el.addEventListener('wheel',e=>{
  e.preventDefault();
  R.cam.radius=Math.min(42,Math.max(10,R.cam.radius*(1+e.deltaY*.0012)));
  updateCam();
 },{passive:false});
 el.addEventListener('click',e=>{
  if(Date.now()-(R.lastPtrUp||0)<600)return;
  handleTap(e);
 });
 if(!window.PointerEvent){
  const tp=new Map();
  let td=null,tpinch=0,tmid=null;
  el.addEventListener('touchstart',e=>{
   e.preventDefault();
   R.usedTouch=true;
   for(const t of e.changedTouches)tp.set(t.identifier,{x:t.clientX,y:t.clientY});
   if(tp.size===1){const t=e.changedTouches[0];td={sx:t.clientX,sy:t.clientY,x:t.clientX,y:t.clientY}}
   else{td=null}
   if(tp.size===2){const v=[...tp.values()];tpinch=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);tmid={x:(v[0].x+v[1].x)/2,y:(v[0].y+v[1].y)/2}}
  },{passive:false});
  el.addEventListener('touchmove',e=>{
   e.preventDefault();
   let ddx=0,ddy=0;
   for(const t of e.changedTouches){
    const p=tp.get(t.identifier);
    if(!p)continue;
    ddx=t.clientX-p.x;ddy=t.clientY-p.y;
    p.x=t.clientX;p.y=t.clientY;
   }
   if(tp.size===1&&td){
    td.x+=ddx;td.y+=ddy;
    R.cam.theta-=ddx*.0055;
    R.cam.phi=Math.min(1.32,Math.max(.32,R.cam.phi-ddy*.0045));
    updateCam();
   }else if(tp.size===2){
    const v=[...tp.values()];
    const dn=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
    const mx=(v[0].x+v[1].x)/2,my=(v[0].y+v[1].y)/2;
    if(tmid)panBy(mx-tmid.x,my-tmid.y);
    if(tpinch>0&&dn>0)R.cam.radius=Math.min(42,Math.max(10,R.cam.radius*tpinch/dn));
    tpinch=dn;tmid={x:mx,y:my};
    updateCam();
   }
  },{passive:false});
  const tend=e=>{
   for(const t of e.changedTouches)tp.delete(t.identifier);
   if(tp.size<2){tmid=null;tpinch=0}
   if(tp.size===0&&td){
    R.lastPtrUp=Date.now();
    const dist=Math.hypot(td.x-td.sx,td.y-td.sy);
    if(dist<12)handleTap({clientX:td.x,clientY:td.y});
    td=null;
   }
  };
  el.addEventListener('touchend',tend);
  el.addEventListener('touchcancel',tend);
 }
}
function renderFallbackGrid(){
 const g=$('#fb-grid');
 let html='';
 for(let t=0;t<GRID*GRID;t++){
  const cat=catAt(t);
  if(cat&&B[cat]&&buildingGrades(B[cat]).includes(state.grade)){
   const b=B[cat],p=state.placed[cat];
   html+=`<div class="lot built" data-tile="${t}" data-cat="${cat}">
    ${canUpgrade(cat)?'<span class="newdot">!</span>':''}
    <span class="lv-tag">Lv.${p.level}</span>
    <span class="house">${b.emoji}</span>
    <span class="stars">${'⭐'.repeat(p.level)}</span>
    <span class="nameplate">${b.name}${neighborsRoad(t).length?' 🚗':''}</span></div>`;
  }else if((state.roads||[]).includes(t)){
   html+=`<div class="lot road" data-tile="${t}"><span class="house" style="font-size:30px">🛣️</span><span class="nameplate">どうろ</span></div>`;
  }else if(decoAt(t)){
   const dd=D[decoAt(t).kind]||{emoji:'🌼',name:'かざり'};
   html+=`<div class="lot deco" data-tile="${t}"><span class="house" style="font-size:30px">${dd.emoji}</span><span class="nameplate">${dd.name}</span></div>`;
  }else{
   html+=`<div class="lot empty" data-tile="${t}"><span>${FB_DECO[t%FB_DECO.length]}</span><span class="plus">＋</span></div>`;
  }
 }
 g.innerHTML=html;
 g.querySelectorAll('.lot').forEach(el=>{
  el.onclick=()=>onTileTap(Number(el.dataset.tile));
 });
}
function renderStats(){
 $('#stat-row').innerHTML=`
  <span class="stat-chip">⭐ 総正解 <b>${state.totalCorrect}</b></span>
  <span class="stat-chip">📝 回答数 <b>${state.totalAnswered}</b></span>
  <span class="stat-chip">📖 ふくしゅう待ち <b>${state.review.length}</b></span>
  <span class="stat-chip">🛣️ 道路 <b>${(state.roads||[]).length}</b> マス</span>
  <span class="stat-chip">🏗️ 街レベル合計 <b>${sumLevels()}</b></span>`;
}
function renderMap(){
 refreshNameUI();
 const r=rankInfo();
 $('#rank-emoji').textContent=r.e;
 $('#rank-name').textContent=r.n;
 $('#town-stats').textContent=`建物 ${Object.keys(state.placed).filter(c=>c!=='review'&&B[c]&&buildingGrades(B[c]).includes(state.grade)).length}/${countableBuildings(state.grade).length}`;
 renderStats();
 if(window.THREE&&isWebGLAvailable()){
  $('#scene-fallback').classList.add('hidden');
  initThree();
  if(R.ok){
   R.renderVisible=true;
   onResize();
   rebuildCity();
   if(!R.compiled){
    try{R.renderer.compile(R.scene,R.camera)}catch(e){}
    R.compiled=true;
   }
   if(pendingPlace)setGhost(pendingPlace);
  }else{
   $('#scene-fallback').classList.remove('hidden');
   renderFallbackGrid();
  }
 }else{
  $('#scene-canvas-host').innerHTML='';
  $('#scene-fallback').classList.remove('hidden');
  renderFallbackGrid();
 }
 refreshHUD();
}

function openReviewMenu(){
 if(loadBlocked||activeSession()||!state.placed.review)return;
 const b=B.review,p=state.placed.review;
 const waiting=state.review.filter(id=>validReview(id)).length;
 openModal(`<h3>${b.emoji} ${b.name}</h3>
 <p class="sub">${catTag('review')}・ふくしゅう待ち ${waiting} 問</p>
 <p style="text-align:center;font-weight:700;font-size:14px;margin-bottom:14px">${waiting?`まちがえた問題を<br class="mbr">もう一度とくのだ!`:`ふくしゅうする問題はないよ!<br class="mbr">あたらしい問題は図書館などの建物で<br class="mbr">クイズにちょうせんしよう!`}</p>
 <div class="close-row" style="flex-direction:column">
 <button class="btn minty big" id="rm-start">📖 ふくしゅうをはじめる!</button>
 ${waiting?'':state.placed.library?'<button class="btn sunny big" id="rm-go-library">📚 図書館でクイズにちょうせん!</button>':'<button class="btn sunny big" id="rm-go-library">📚 無料の図書館を建てよう!</button>'}
 <button class="btn ghosty small" id="rm-remove">撤去する</button>
 <button class="btn ghosty small" onclick="closeModal()">とじる</button>
 </div>`);
  $('#rm-start').onclick=()=>startReview();
 if(!waiting)$('#rm-go-library').onclick=()=>{closeModal();toast(state.placed.library?'図書館をタップして「クイズをはじめる」をおしてね!':'左下の「🏗️ こうじする」から無料の図書館を建ててね!')};
 $('#rm-remove').onclick=()=>{if(state.placed.review===p)openRemoval(p.tile,'review')};
}

function openBuildingMenu(cat){
 if(loadBlocked||activeSession()||!validCat(cat)||!state.placed[cat])return;
 const b=B[cat],p=state.placed[cat],prog=state.progress[cat]||0;
 const upDis=!canUpgrade(cat);
 const nextTh=p.level<3?LV_NEED[p.level]:null;
const progTxt=nextTh!==null?`あと ${Math.max(0,nextTh-prog)} 問 正解でアップグレードOK!<br class="wbr"><br class="mbr">(アップグレードにはコイン 💰${LV_COST[p.level]}が必要だよ)`:`レベルMAXだよ!えらい!!`;
 openModal(`<h3>${b.emoji} ${b.name} <small>Lv.${p.level}</small></h3>
 <p class="sub">${catTag(cat)}・これまでの正解 ${prog} 問</p>
 <p style="text-align:center;font-weight:700;font-size:14px;margin-bottom:14px">${progTxt}</p>
 <div class="close-row" style="flex-direction:column">
 <button class="btn minty big" id="bm-start">▶️ クイズをはじめる!</button>
 <button class="btn sunny" id="bm-up" ${upDis?'disabled':''}>⬆️ レベルアップする(💰${LV_COST[p.level]})</button>
 <button class="btn ghosty small" id="bm-remove">撤去する</button>
 <button class="btn ghosty small" onclick="closeModal()">とじる</button>
 </div>`);
  $('#bm-start').onclick=()=>startSession(cat,false);
 $('#bm-remove').onclick=()=>{if(state.placed[cat]===p)openRemoval(p.tile,cat)};
 $('#bm-up').onclick=()=>{
  if(state.placed[cat]!==p||!canUpgrade(cat))return;
  state.coins-=LV_COST[p.level];
  p.level++;
  save();closeModal();
  sfx('level');confetti(40);
  toast(`🎉 ${b.name}が Lv.${p.level} になったよ!`);
  renderMap();
 };
}

function pickDifficulty(level,rnd){
 if(level===1)return 1;
 if(level===2)return rnd<.6?2:1;
 return rnd<.7?3:2;
}
function buildSession(cat,isReview){
 const grade=state.grade;
 const base={grade,cat,isReview,i:0,streak:0,coinsEarned:0,log:[],results:[]};
 if(isReview){
  const ids=shuffle([...new Set(state.review.filter(id=>validReview(id,grade)))]).slice(0,5);
  return{...base,cat:null,qs:ids.map(id=>questionById(id,grade))};
 }
 const level=state.placed[cat].level;
 const pool=questionsForGrade(grade)?.[cat];
 if(!Array.isArray(pool)||!pool.length)return{...base,qs:[]};
 const wrap=q=>({cat,q,id:q.id});
 if(cat==='flower'&&grade!=='5'){
  const groups=[...new Set(pool.filter(q=>q.kind==='reading'&&q.d===level).map(q=>q.group))];
  const group=shuffle(groups)[0];
  return{...base,qs:pool.filter(q=>q.kind==='reading'&&q.group===group).map(wrap)};
 }
 const len=(cat==='essay'||cat==='summary')?1:cat==='flower'?2:5;
 const qs=[],used=new Set();
 const parts=cat==='park'?[...new Set(pool.map(q=>q.part))]:[];
 for(let k=0;k<len;k++){
  const d=pickDifficulty(level,Math.random());
  const available=pool.filter(q=>!used.has(q.id)&&(!parts[k]||q.part===parts[k]));
  let cand=available.filter(q=>q.d===d);
  if(!cand.length)cand=available.filter(q=>q.d<=level);
  if(!cand.length)cand=available;
  const q=shuffle(cand)[0];
  if(!q)break;
  used.add(q.id);
  qs.push(wrap(q));
 }
 return{...base,qs};
}

function startSession(cat,isReview){
 if(loadBlocked)return;
 const bank=questionsForGrade();
  if(!bank||!countableBuildings(state.grade).every(b=>Array.isArray(bank[b.cat])&&bank[b.cat].length)){
  toast('問題データを読み込めません。完全なHTMLファイルを開き直してください。');return;
 }
 if(isReview?!state.review.some(id=>validReview(id)):!validCat(cat)||!state.placed[cat])return;
 stopSpeech();
 exitPlace();closeModal();
 session=buildSession(cat,isReview);
 if(!session.qs.length){session=null;toast('問題が見つかりませんでした');return}
 $('#q-building').textContent=isReview?'📖 ふくしゅう':`${B[cat].emoji} ${B[cat].name} Lv.${state.placed[cat].level}`;
 show('scr-quiz');
 renderQuestion();
}

function updateDots(){
 const box=$('#q-dots');
 box.innerHTML=session.qs.map((_,k)=>{
  let c='dot';
  if(k<session.i)c+=session.results[k]?' done-ok':' done-ng';
  if(k===session.i)c+=' now';
  return`<span class="${c}"></span>`;
 }).join('');
 const st=$('#q-streak');
 if(session.streak>=2&&!session.isReview){st.textContent=`🔥 ${session.streak} れんぞく!`;st.classList.remove('hidden')}
 else st.classList.add('hidden');
}

function feedbackHTML(ok,exp,extra=''){
 return`<div class="feedback ${ok?'good':'bad'}">
  <div class="fb-head">${ok?'⭕️ せいかい!':'❌️ ざんねん…'}</div>
  <div class="fb-exp">${exp}${extra?('<br>'+extra):''}</div>
  <div class="fb-next"><button class="btn lavvy" id="fb-next">${session.i<session.qs.length-1?'つぎへ ▶':'結果をみる 🎉'}</button></div>
 </div>`;
}
function bindFeedback(ok){
 const s=session,i=s.i,button=$('#fb-next');
 button.onclick=()=>{
  if(!currentQuestion(s,i)||!Object.hasOwn(s.results,i))return;
  button.disabled=true;
  stopSpeech();
  session.i++;
  if(session.i>=session.qs.length)finishSession();
  else renderQuestion();
 };
}

function addCoins(n){
 state.coins+=n;
 session.coinsEarned+=n;
 refreshHUD();
 if(n>0)sfx('coin');
}
function recordResult(ok,baseCoins,label){
 if(!session||!canAnswer(session,session.i))return false;
 session.results[session.i]=ok;
 state.totalAnswered++;
 let amount=0;
 if(ok){
  state.totalCorrect++;
  if(session.isReview){
   amount=4;
   state.review=state.review.filter(x=>x!==session.qs[session.i].id);
  }else{
   session.streak++;
   amount=baseCoins+(session.streak>=2?Math.min(session.streak-1,4)*2:0);
   const cat=session.qs[session.i].cat;
   state.progress[cat]=(state.progress[cat]||0)+1;
  }
 }else{
  session.streak=0;
  if(!session.isReview&&!['writing','summary'].includes(questionKind(session.qs[session.i].q))){
   const id=session.qs[session.i].id;
   if(!state.review.includes(id))state.review.push(id);
  }
 }
 session.log.push({label:`Q${session.i+1} ${label}`,amount});
 addCoins(amount);
 save();
}

function renderQuestion(){
 stopSpeech();
 updateDots();
 const item=session.qs[session.i];
 const q=item.q;
 const zone=$('#q-answer-zone');
 const card=$('#q-card');
 const kind=questionKind(q);
 if(kind==='reading')return renderReading(card,zone,item);
 if(kind==='order-pair')return renderOrderPair(card,zone,item);
 if(kind==='listening')return renderStructuredListening(card,zone,item);
 if(kind==='writing'||kind==='summary')return renderWriting(card,zone,item);
 if(kind==='order')return renderOrder(card,zone,item);
 if(q.t==='pic')return renderListening(card,zone,item,true);
 if(q.t==='qa')return renderListening(card,zone,item,false);
 return renderChoice(card,zone,item);
}

function escapeHTML(text){return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function textElement(parent,tag,className,text){
 const el=document.createElement(tag);el.className=className;el.textContent=text;parent.appendChild(el);return el;
}
function textNode(parent,text){
 if(typeof document.createTextNode==='function'){parent.appendChild(document.createTextNode(text));return}
 textElement(parent,'#text','',text);
}
function renderReading(card,zone,item){
 renderChoice(card,zone,item,true);
}
function renderOrderPair(card,zone,item){
 const q=item.q;
 const sentence=q.prefix+q.order.map(n=>q.units[n-1]).join(' ')+q.suffix;
 const pair=q.pairs[q.a].join(' → ');
 renderChoice(card,zone,{...item,q:{...q,q:q.jp,c:q.pairs.map(p=>p.join(' → ')),e:q.e+'\n完成文: '+sentence+'\n正しい組: '+pair}},false,true);
 textElement(card,'div','order-units',q.units.map((unit,k)=>`${k+1}: ${unit}`).join(' / '));
 textElement(card,'div','order-frame',q.prefix+q.units.map((_,k)=>`[ ${k+1} ]`).join(' ')+q.suffix);
 textElement(card,'div','qjp',`空欄の${q.positions[0]}番目・${q.positions[1]}番目に入る語句の番号の組を選ぼう。語句の番号は変わりません。`);
}
function renderChoice(card,zone,item,reading=false,numbered=false){
 const s=session,i=s.i;
 const q=item.q;
 card.innerHTML=`<span class="qcat-tag">${catTag(item.cat,s.grade)}</span>`;
 if(reading){
  const passage=textElement(card,'div','reading-passage',q.passage);
  passage.setAttribute('lang','en');
  passage.setAttribute('aria-label','読解の本文');
 }
 {
  const qtext=textElement(card,'div','qtext','');
  String(q.q).split(/(_{2,})/).forEach(part=>{
   if(/^_{2,}$/.test(part)){const b=document.createElement('span');b.className='blank';b.textContent='\u00A0\u00A0\u00A0\u00A0\u00A0';qtext.appendChild(b)}
   else if(part)textNode(qtext,part);
  });
 }
 const choices=q.c.map((t,k)=>({t,ok:k===q.a}));
 const opts=numbered?choices:shuffle(choices);
 zone.innerHTML=`<div class="choices panel" style="margin-top:14px;background:transparent;border:none;box-shadow:none;padding:0">
 ${opts.map((o,k)=>`<button class="choice" data-ok="${o.ok}"><span class="ckey">${numbered?k+1:'ABCD'[k]}</span>${escapeHTML(o.t)}</button>`).join('')}
 </div>`;
 zone.querySelectorAll('.choice').forEach(btn=>{
  btn.onclick=()=>{
   if(!canAnswer(s,i))return;
   const ok=btn.dataset.ok==='true';
   zone.querySelectorAll('.choice').forEach(b=>{b.disabled=true;if(b.dataset.ok==='true')b.classList.add('ok')});
   if(!ok)btn.classList.add('ng');
   sfx(ok?'ok':'ng');
   recordResult(ok,3+2*q.d,'正解ボーナス');
   updateDots();
   zone.insertAdjacentHTML('beforeend',feedbackHTML(ok,escapeHTML(q.e)));
   bindFeedback(ok);
   $('#fb-next').focus();
  };
 });
}

function renderOrder(card,zone,item){
 const s=session,i=s.i;
 const q=item.q;
 card.innerHTML=`<span class="qcat-tag">🚉 じゅんじょにならべよう</span>
 <div class="qtext">${q.jp}</div>
 <div class="qjp">単語をタップして、正しい英語の文を作ろう!</div>`;
 let chips=shuffle(q.words.map((w,k)=>({w,id:k})));
 if(chips.every(c=>norm(c.w)===norm(q.words[chips.indexOf(c)])))chips=shuffle(chips);
 const selected=[];
 zone.innerHTML=`<div class="panel" style="margin-top:14px;padding:18px">
  <div class="order-slots" id="or-slots"><span class="ph">ここにタップした単語が並ぶよ</span></div>
  <div class="order-bank" id="or-bank"></div>
  <div class="fb-next"><button class="btn minty" id="or-check" disabled>これで決定!✔</button>
  <button class="btn ghosty small" id="or-clear">やりなおす</button></div></div>`;
 function paintBank(){
  $('#or-bank').innerHTML=chips.map(c=>`<button class="chip ${c.used?'hidden':''}" data-id="${c.id}">${c.w}</button>`).join('');
  $('#or-bank').querySelectorAll('.chip').forEach(b=>{
   b.onclick=()=>{
    if(!canAnswer(s,i))return;
    const c=chips.find(x=>String(x.id)===b.dataset.id);
    if(c.used)return;
    c.used=true;selected.push(c);
    sfx('coin');
    paintSlots();
   };
  });
 }
 function paintSlots(){
  $('#or-slots').innerHTML=selected.length?selected.map((c,k)=>`<button class="chip in-slot" data-k="${k}">${c.w}</button>`).join('')
   :'<span class="ph">ここにタップした単語が並ぶよ</span>';
  $('#or-slots').querySelectorAll('.chip').forEach(b=>{
   b.onclick=()=>{
    if(!canAnswer(s,i))return;
    const k=Number(b.dataset.k);
    if(!selected[k])return;
    selected[k].used=false;
    selected.splice(k,1);
    paintSlots();
   };
  });
  $('#or-check').disabled=selected.length!==q.words.length;
  paintBank();
 }
 paintSlots();
 $('#or-clear').onclick=()=>{if(!canAnswer(s,i))return;selected.forEach(c=>c.used=false);selected.length=0;paintSlots()};
 $('#or-check').onclick=()=>{
  if(!canAnswer(s,i)||selected.length!==q.words.length)return;
  const ans=selected.map(c=>norm(c.w)).join(' ');
  const ok=ans===norm(q.words.join(' '));
  sfx(ok?'ok':'ng');
  recordResult(ok,3+2*q.d,'並べかえボーナス');
  $('#or-check').disabled=true;
  $('#or-clear').disabled=true;
  $('#or-bank').style.pointerEvents='none';
  zone.querySelectorAll('.chip').forEach(b=>{b.disabled=true});
  const extra=ok?'':'<br>正解: <b>'+q.words.join(' ')+'</b>';
  zone.querySelector('.panel').insertAdjacentHTML('beforeend',feedbackHTML(ok,q.e,extra));
  bindFeedback(ok);
 };
}

function rateFor(d){return d<=1?.85:d===2?.95:1.02}
function listeningSequence(q){
 const sequence=q.segments.map(segment=>({...segment}));
 if(q.q)sequence.push({speaker:'narrator',text:q.q});
 if(q.part==='response'||q.part==='picture')q.c.forEach((text,k)=>sequence.push({speaker:q.part==='response'?'B':'narrator',text:`${k+1}. ${text}`}));
 return sequence;
}
function renderStructuredListening(card,zone,item){
 const s=session,i=s.i,q=item.q;
 const auditory=q.part==='response'||q.part==='picture';
 const partName={response:'会話への応答',picture:'絵に合う英文',dialogue:'対話の内容',passage:'英文の内容'}[q.part];
 const sequence=listeningSequence(q);
 const transcript=sequence.map(segment=>`${segment.speaker}: ${segment.text}`).join('\n');
 card.innerHTML='<span class="qcat-tag"></span><div class="speak-zone"><button class="speak-btn" id="speak-btn" aria-label="練習用に2回再生">再生</button><span class="speak-hint"></span></div>';
 card.querySelector('.qcat-tag').textContent='ちょうかい練習 / '+partName;
 const hint=card.querySelector('.speak-hint'),spBtn=card.querySelector('#speak-btn');
 hint.textContent='本番と同じ2回再生。追加の練習用リプレイもできます。質問は音声で聞こう。';
 if(q.picture){
  const scene=textElement(card,'div','listening-picture','');
  scene.setAttribute('role','img');scene.setAttribute('aria-label','問題の場面を表す絵');
  scene.innerHTML=q.picture;
  scene.querySelectorAll('svg').forEach(svg=>svg.setAttribute('aria-hidden','true'));
 }
 textElement(card,'div','qjp',auditory?'音声の1・2・3から、答えの番号を選ぼう。':'会話・英文と質問を聞き、答えを選ぼう。');
 zone.innerHTML='<div class="choices panel"></div>';
 const choices=zone.querySelector('.choices');
 q.c.forEach((text,k)=>{
  const btn=textElement(choices,'button','choice',auditory?String(k+1):`${k+1}. ${text}`);
  btn.setAttribute('data-ok',String(k===q.a));
  btn.setAttribute('data-number',String(k+1));
  btn.onclick=()=>{
   if(!canAnswer(s,i))return;
   stopSpeech();spBtn.classList.remove('playing');
   const ok=k===q.a;
   choices.querySelectorAll('.choice').forEach(b=>{b.disabled=true;if(b.dataset.ok==='true')b.classList.add('ok')});
   if(!ok)btn.classList.add('ng');
   sfx(ok?'ok':'ng');recordResult(ok,3+2*q.d,'リスニングボーナス');updateDots();
   const details=textElement(zone,'details','listening-transcript','');
   textElement(details,'summary','','音声の文章をみる');
   textElement(details,'div','transcript-text',transcript+'\n'+q.c.map((text,k)=>`${k+1}. ${text}`).join('\n'));
   zone.insertAdjacentHTML('beforeend',feedbackHTML(ok,escapeHTML(q.e)));
   bindFeedback(ok);$('#fb-next').focus();
  };
 });
 function fallback(){
  hint.textContent='音声を再生できません。音声練習ではなく、下の文章を読んで答えてください。';
  if(!card.querySelector('.tts-fallback'))textElement(card,'div','tts-fallback transcript-text',transcript+'\n'+q.c.map((text,k)=>`${k+1}. ${text}`).join('\n'));
 }
 async function play(){
  if(!currentQuestion(s,i))return;
  stopSpeech();
  const token=speechGeneration;
  const live=()=>token===speechGeneration&&currentQuestion(s,i);
  if(!HAS_TTS){fallback();return}
  spBtn.classList.add('playing');
  for(let pass=0;pass<2;pass++)for(const segment of sequence){
   if(!live())return;
   const ok=await speak(segment.text,rateFor(q.d),segment.speaker,token);
   if(!live())return;
   if(!ok){spBtn.classList.remove('playing');fallback();return}
  }
  if(live())spBtn.classList.remove('playing');
 }
 spBtn.onclick=play;
 if(HAS_TTS)speechTimer=setTimeout(()=>{if(canAnswer(s,i))play()},350);
 else{spBtn.disabled=true;fallback()}
}
function renderListening(card,zone,item,isPic){
 const s=session,i=s.i;
 const q=item.q;
 const transcript=isPic?q.say:(item.cat==='park'?q.say:'');
 card.innerHTML=`<span class="qcat-tag">👂 ちょうかいクイズ</span>
 <div class="speak-zone">
  <button class="speak-btn" id="speak-btn">🔊</button>
  <span class="speak-hint">おして音を聞こう!なんどでも聞けるよ(はやさも変わるよ)</span>
 </div>
 ${!HAS_TTS?'<div class="feedback bad" style="margin:8px 12px"><div class="fb-exp">⚠️ このブラウザでは音が出ないみたい…下の文章を読んで答えてね!</div></div><div class="qjp" style="font-size:17px">'+transcript+'</div>':''}
 ${isPic?'':`<div class="qtext" style="font-size:min(4.8vw,22px);margin-top:10px">${q.q}</div>`}`;
 zone.innerHTML=isPic
 ?`<div class="pic-grid panel" style="background:transparent;border:none;box-shadow:none;padding:0">
   ${shuffle(q.s.map((t,k)=>({t,ok:k===q.a}))).map(o=>`<button class="pic" data-ok="${o.ok}">${o.t}</button>`).join('')}</div>`
 :`<div class="choices panel" style="margin-top:14px;background:transparent;border:none;box-shadow:none;padding:0">
   ${shuffle(q.s.map((t,k)=>({t,ok:k===q.a}))).map((o,k)=>`<button class="choice" data-ok="${o.ok}"><span class="ckey">${'ABCD'[k]}</span>${o.t}</button>`).join('')}</div>`;
 const spBtn=$('#speak-btn');
 async function play(){
  if(!currentQuestion(s,i)||spBtn.disabled)return;
  spBtn.classList.add('playing');
   stopSpeech();
   const token=speechGeneration;
   await speak(q.say,rateFor(q.d),'narrator',token);
   if(token===speechGeneration&&currentQuestion(s,i))spBtn.classList.remove('playing');
 }
 spBtn.onclick=play;
 speechTimer=setTimeout(play,350);
 zone.querySelectorAll('.choice,.pic').forEach(btn=>{
  btn.onclick=async()=>{
   if(!canAnswer(s,i))return;
   stopSpeech();
   const ok=btn.dataset.ok==='true';
   zone.querySelectorAll('.choice,.pic').forEach(b=>{b.disabled=true;if(b.dataset.ok==='true')b.classList.add('ok')});
   if(!ok)btn.classList.add('ng');
   sfx(ok?'ok':'ng');
   recordResult(ok,3+2*q.d,'リスニングボーナス');
   updateDots();
   zone.insertAdjacentHTML('beforeend',
    `<details style="margin-top:10px;text-align:center;font-size:13px;color:var(--ink-soft)"><summary style="cursor:pointer">🔊 音声の文章をみる</summary><div class="panel" style="margin-top:8px;padding:12px;font-weight:700">${transcript}<br><span style="color:var(--pink-d)">訳) ${q.e.split('=')[1]||''}</span></div></details>`);
   zone.insertAdjacentHTML('beforeend',feedbackHTML(ok,escapeHTML(q.e)));
   bindFeedback(ok);
    spBtn.classList.remove('playing');
  };
 });
}

function wordCount(s){return s.trim()?s.trim().split(/\s+/).filter(Boolean).length:0}

function renderWriting(card,zone,item){
 const s=session,i=s.i;
 const q=item.q;
 const isSummary=q.kind==='summary';
 const[min,max]=isSummary?(SUMMARY_RANGE[s.grade]||[25,50]):(WRITING_RANGE[s.grade]||[15,25]);
 card.innerHTML=`<span class="qcat-tag">${isSummary?'要約（本番形式）':s.grade==='5'?'追加作文練習（本番の試験ではありません）':'英作文（本番形式）'}</span>
 <div class="qtext" style="font-size:min(4.8vw,23px)">${q.en}</div>
 ${isSummary&&q.passage?`<div class="reading-passage" style="font-size:16px">${escapeHTML(q.passage).replace(/\n/g,'<br>')}</div>`:''}
 ${q.points?`<div class="order-frame" style="margin-top:10px"><b>📝 POINTS（観点）:</b><br>${q.points.map((p,k)=>`${k+1}. ${p}`).join('<br>')}</div>`:''}
 <div class="qjp">${q.jp}</div>
 <div class="qjp" style="margin-top:8px">💡 ヒント: ${q.hints.join(' / ')}</div>`;
 zone.innerHTML=`<div class="panel" style="margin-top:14px">
  <textarea class="writebox" id="wr-box" placeholder="Write your answer here..."></textarea>
  <div class="writing-meta"><span>${gradeLabel(s.grade)}の目標は ${min}〜${max}語!</span><span id="wr-count">0 語</span></div>
  <div class="fb-next"><button class="btn lavvy big" id="wr-submit" disabled>できたら提出!📮</button></div>
  <div id="wr-checkzone"></div></div>`;
 const box=$('#wr-box'),cnt=$('#wr-count'),sub=$('#wr-submit');
 box.addEventListener('input',()=>{
  if(!canAnswer(s,i)||box.disabled)return;
  const n=wordCount(box.value);
  cnt.textContent=n+' 語';
  cnt.className=n>=min&&n<=max?'over':'';
  sub.disabled=n<3;
 });
 sub.onclick=()=>{
  if(!canAnswer(s,i)||box.disabled||wordCount(box.value)<3)return;
  box.disabled=true;sub.disabled=true;sub.textContent='提出ずみ ✔';
  $('#wr-checkzone').innerHTML=`
   <div style="margin-top:16px;padding:14px;border-radius:16px;background:var(--sun-l);border:2px solid #ffe6a8">
    <div style="font-weight:900;margin-bottom:6px">🌟 お手本の答え</div>
    <div style="font-size:15px;line-height:1.7">${q.sample}</div>
    <div style="font-size:13px;color:var(--ink-soft);margin-top:6px">(約 ${wordCount(q.sample)} 語)</div>
   </div>
   <div style="font-weight:900;margin-top:16px;text-align:center">じぶんの答えをチェックしてね!</div>
   <div class="checklist" id="wr-checks">${writingChecks(s.grade,q.kind==='summary').map((c,k)=>`<label class="checkrow"><input type="checkbox" data-k="${k}">${c}</label>`).join('')}</div>
   <div class="fb-next"><button class="btn pinky big" id="wr-done">コインをもらってつぎへ 💰</button></div>`;
  $('#wr-checks').querySelectorAll('input').forEach(inp=>{
   inp.onchange=()=>{if(canAnswer(s,i))inp.closest('.checkrow').classList.toggle('checked',inp.checked)};
  });
  $('#wr-done').onclick=()=>{
   if(!canAnswer(s,i))return;
   $('#wr-done').disabled=true;
   $('#wr-checks').querySelectorAll('input').forEach(inp=>{inp.disabled=true});
   const checks=$('#wr-checks').querySelectorAll('input:checked').length;
   sfx(checks>=2?'ok':'ng');
   recordResult(checks>=2,5+checks*5,'✍️ 作文ボーナス');
   updateDots();
   $('#wr-checkzone').insertAdjacentHTML('beforeend',feedbackHTML(checks>=2,q.e+'<br>お手本と見くらべて、直したいところがあれば直しておこう!'));
   bindFeedback(checks>=2);
  };
 };
}

function finishSession(){
 if(!activeSession()||!session.qs.length||!session.qs.every((_,i)=>Object.hasOwn(session.results,i)))return;
 session.finished=true;
 stopSpeech();
 const n=session.qs.length;
 const correct=session.results.filter(Boolean).length;
 if(!session.isReview&&correct===n&&n>=3){addCoins(10);session.log.push({label:'🎉 パーフェクトボーナス',amount:10});save()}
 if(!session.isReview&&(state.roads||[]).length){
  const connected=Object.keys(state.placed).filter(c=>c!=='review'&&neighborsRoad(state.placed[c].tile).length>0).length;
  if(connected>0){
   const amt=connected*2;
   addCoins(amt);
   session.log.push({label:`🚗 道路ボーナス(そばに道のある建物×${connected})`,amount:amt});
   save();
  }
 }
 show('scr-result');
 const perfect=correct===n&&n>=3;
 $('#res-title').textContent=session.isReview?'📖 ふくしゅうクリア!':perfect?'パーフェクト!! すごい!':correct>=Math.ceil(n/2)?'よくできました!':'あと少し!がんばろう!';
 $('#res-stars').innerHTML=('⭐'.repeat(correct)+'☆'.repeat(n-correct));
 $('#res-coins').textContent=session.coinsEarned;
 $('#res-detail').innerHTML=session.log.map(l=>`<div><span>${l.label}</span><span>+${l.amount} 💰</span></div>`).join('');
 textElement($('#res-detail'),'p','practice-result',`${gradeLabel(session.grade)} ${session.cat?catTag(session.cat,session.grade):'ふくしゅう'}の練習結果です。模擬試験や合格の保証ではありません。`);
 const pw=$('#res-progress-wrap');
 const lb=$('#levelup-banner');
 if(session.isReview||!session.cat){
  pw.classList.add('hidden');lb.classList.add('hidden');
 }else{
  const b=B[session.cat],p=state.placed[session.cat],cur=state.progress[session.cat]||0;
  pw.classList.remove('hidden');
  if(p.level<3){
   const target=LV_NEED[p.level];
   $('#res-progress-label').textContent=`${b.emoji} ${b.name} Lv.${p.level}`;
   $('#res-progress-num').textContent=Math.min(cur,target)+' / '+target;
   setTimeout(()=>{$('#res-progress-fill').style.width=Math.min(100,cur/target*100)+'%'},80);
  }else{
   $('#res-progress-label').textContent=`${b.emoji} ${b.name} Lv.MAX`;
   $('#res-progress-num').textContent='';
   setTimeout(()=>{$('#res-progress-fill').style.width='100%'},80);
  }
  if(canUpgrade(session.cat)){
   lb.classList.remove('hidden');
   $('#levelup-text').textContent=`${b.name}をタップして、レベルアップしよう!`;
   confetti(30);sfx('level');
  }else lb.classList.add('hidden');
 }
 if(perfect&&!lb||perfect&&lb.classList.contains('hidden'))confetti(26);
 save();
}

function startReview(){
 if(!state.review.length){toast('ふくしゅうする問題はないよ!');return}
 startSession(null,true);
}

function goHome(){
 exitPlace();
 if(activeSession()){
  const s=session;
  askYesNo('まちにもどる?','クイズの途中だけど、やめてまちへもどる?','もどる',()=>{if(session!==s)return;stopSpeech();session=null;show('scr-town');renderMap()});
 }else{
  stopSpeech();session=null;show('scr-town');renderMap();
 }
}

function refreshGradeUI(){
 $('#title-flower').innerHTML=flowerGuide(activeGrade);
 const exists=!!towns[activeGrade];
 document.querySelectorAll('.grade-card').forEach(button=>{
  const selected=button.dataset.grade===activeGrade;
  button.setAttribute('aria-pressed',String(selected));
  button.querySelector('.grade-status').textContent=selected?'選択中':'選ぶ';
 });
 $('#active-grade').textContent=gradeLabel(activeGrade);
 $('#quiz-grade').textContent=gradeLabel(session?.grade||activeGrade);
 $('#start-btn').textContent=exists?'つづきから!':'はじめる!';
 $('#start-btn').className=exists?'btn minty big':'btn pinky big';
 $('#reset-btn-top').classList.toggle('hidden',!exists);
}
function clearGradeActivity(){
 stopSpeech();session=null;exitPlace();closeModal();
 R.cam={theta:.78,phi:1.02,radius:26};
 R.target={x:0,z:0};R.dragMode='orbit';R.lastPtrUp=Date.now();
 R.clearPointers?.();
 if(R.hover)R.hover.visible=false;
 if(R.ok)updateCam();
 refreshSceneHint();
}
function switchGrade(grade){
 if(loadBlocked){toast('セーブデータの確認ができていないため、級を切り替えられません');return}
 if(!validGrade(grade)||grade===activeGrade){refreshGradeUI();return}
 const owner=state,previous=session; const fromTitle=$('#scr-title').classList.contains('active');
 const fromSettings=$('#settings-grade')!==null;
 const change=()=>{
  if(state!==owner||session!==previous)return;
  if(!freshStart)towns[activeGrade]=state;
  clearGradeActivity();
  activeGrade=grade;
  freshStart=!towns[grade];
  state=towns[grade]||freshState(grade);
  persistTowns();
  applyGfx();refreshHUD();refreshNameUI();renderStats();
  if(fromTitle){show('scr-title');return}
  if(freshStart){show('scr-title');openNaming(true);return}
  show('scr-town');renderMap();
  if(fromSettings)openSettings();
 };
 refreshGradeUI();
  if(activeSession())askYesNo('級を切り替える?','途中のクイズを終了します。回答済みの記録は今の級に残ります。','切り替える',()=>{if(state===owner&&session===previous)change()});
 else change();
}
function wipeAndRestart(){
 if(loadBlocked){toast('セーブデータの確認ができていないため、データを消せません');return}
 const remaining={...towns};
 delete remaining[activeGrade];
 if(!persistTowns(remaining))return;
 towns=remaining;
 clearGradeActivity();
 state=freshState(activeGrade);
 freshStart=true;
 applyGfx();
 show('scr-title');refreshHUD();refreshNameUI();renderStats();
 toast(gradeLabel(activeGrade)+'の街だけを消しました。他の級の街は残っています。');
}
function applyGfx(){
 if(!R.renderer)return;
 R.renderer.setPixelRatio(state.lowGfx?1:Math.min(window.devicePixelRatio||1,1.5));
 if(R.sun){
  const want=state.lowGfx?1024:2048;
  if(R.sun.shadow.mapSize.x!==want){
   R.sun.shadow.mapSize.set(want,want);
   if(R.sun.shadow.map){R.sun.shadow.map.dispose();R.sun.shadow.map=null}
   R.sun.shadow.needsUpdate=true;
  }
 }
 onResize();
}
function openSettings(){
 if(loadBlocked)return;
 const snd=state.sound?'🔔 効果音:ON':'🔕 効果音:OFF';
 const gfx=state.lowGfx?'🖼️ 画面: 軽いモード':'🖼️ 画面: きれい';
 openModal(`<h3>⚙️ せってい</h3><p class="sub">まちの設定をかえられるよ</p>
 <div class="close-row" style="flex-direction:column">
 <fieldset class="grade-selector" id="settings-grade">
  <legend>練習する級を選ぼう</legend>
  <div class="grade-options">
   <button type="button" class="grade-card" data-grade="5" aria-pressed="${activeGrade==='5'}" aria-label="英検5級" aria-describedby="settings-grade-5-description">
    <span class="grade-name">英検5級</span><span class="grade-description" id="settings-grade-5-description">はじめての英語・きほんから</span><span class="grade-status">${activeGrade==='5'?'選択中':'選ぶ'}</span>
   </button>
   <button type="button" class="grade-card" data-grade="4" aria-pressed="${activeGrade==='4'}" aria-label="英検4級" aria-describedby="settings-grade-4-description">
    <span class="grade-name">英検4級</span><span class="grade-description" id="settings-grade-4-description">きほんの次のステップへ</span><span class="grade-status">${activeGrade==='4'?'選択中':'選ぶ'}</span>
   </button>
   <button type="button" class="grade-card" data-grade="3" aria-pressed="${activeGrade==='3'}" aria-label="英検3級" aria-describedby="settings-grade-3-description">
    <span class="grade-name">英検3級</span><span class="grade-description" id="settings-grade-3-description">4級の次のステップへ</span><span class="grade-status">${activeGrade==='3'?'選択中':'選ぶ'}</span>
   </button>
   <button type="button" class="grade-card" data-grade="pre2" aria-pressed="${activeGrade==='pre2'}" aria-label="英検準2級" aria-describedby="settings-grade-pre2-description">
    <span class="grade-name">英検準2級</span><span class="grade-description" id="settings-grade-pre2-description">3級の次のステップへ</span><span class="grade-status">${activeGrade==='pre2'?'選択中':'選ぶ'}</span>
   </button>
   <button type="button" class="grade-card" data-grade="2" aria-pressed="${activeGrade==='2'}" aria-label="英検2級" aria-describedby="settings-grade-2-description">
    <span class="grade-name">英検2級</span><span class="grade-description" id="settings-grade-2-description">準2級の次のステップへ</span><span class="grade-status">${activeGrade==='2'?'選択中':'選ぶ'}</span>
   </button>
   <button type="button" class="grade-card" data-grade="pre1" aria-pressed="${activeGrade==='pre1'}" aria-label="英検準1級" aria-describedby="settings-grade-pre1-description">
    <span class="grade-name">英検準1級</span><span class="grade-description" id="settings-grade-pre1-description">2級の次のステップへ</span><span class="grade-status">${activeGrade==='pre1'?'選択中':'選ぶ'}</span>
   </button>
  </div>
 </fieldset>
 <button class="btn lavvy big" id="st-help">❓ 遊び方をみる</button>
 <button class="btn ghosty big" id="st-gfx">${gfx}</button>
 <button class="btn ghosty big" id="st-sound">${snd}</button>
 <button class="btn ghosty big" id="st-export">💾 セーブをファイルに保存</button>
 <button class="btn ghosty big" id="st-import">📂 ファイルから読み込む</button>
 <input type="file" id="st-import-file" accept=".json,application/json" class="hidden">
 <button class="btn ghosty" id="st-reset">${gradeLabel(activeGrade)}の街だけ消して最初から</button>
 <div class="support-box">
 <h4>🧑‍💻 保護者の方へ</h4>
 <p>えいけんタウンは無料で遊べます。つくった人：keima_tech<br>開発の裏側は下の記事で紹介しています。記事からチップをいただけると、開発の大きな励みになります。</p>
 <a class="btn sunny small" href="https://note.com/keima_tech/n/n35bdac50da02" target="_blank" rel="noopener">📝 5級〜準1級対応のおしらせをよむ</a>
 <a class="btn sunny small" href="https://note.com/keima_tech/n/n2a9bd683282c" target="_blank" rel="noopener">📝 開発記をよむ</a>
 </div>
 <button class="btn pinky small" onclick="closeModal()">とじる</button>
 </div>`);
 $('#settings-grade').querySelectorAll('.grade-card').forEach(button=>{button.onclick=()=>switchGrade(button.dataset.grade)});
 refreshGradeUI();
 $('#st-help').onclick=openTutorial;
 $('#st-gfx').onclick=()=>{
  state.lowGfx=!state.lowGfx;
  save();
  applyGfx();
  toast(state.lowGfx?'軽いモードにしたよ!':'きれいモードにしたよ!');
  openSettings();
 };
 $('#st-sound').onclick=()=>{state.sound=!state.sound;save();refreshHUD();openSettings()};
 $('#st-export').onclick=()=>{closeModal();exportSave()};
 $('#st-import').onclick=()=>{if(loadBlocked||activeSession())return;$('#st-import-file').click()};
 $('#st-import-file').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)importSave(f)};
 $('#st-reset').onclick=()=>askYesNo(gradeLabel(activeGrade)+'のデータを消す?','この級の街・おかね・きろくが消えて、<br class="mbr">この級は最初からになります。<br class="wbr"><br class="mbr">他の級の記録は残るよ。いい?','消して最初から',wipeAndRestart);
}
$('#save-retry').onclick=retryLoad;
$('#start-btn').onclick=()=>{
 if(loadBlocked){toast('セーブデータの確認ができていないため、まだ始められません');return}
 if(freshStart){freshStart=false;openNaming(true);return}
 show('scr-town');renderMap();
};
$('#rename-btn').onclick=()=>openNaming(false);
$('#build-open').onclick=()=>openPalette();
$('#settings-btn').onclick=openSettings;
$('#how-btn-title').onclick=openTutorial;
$('#import-btn-title').onclick=()=>{if(loadBlocked||activeSession())return;$('#title-import-file').click()};
$('#title-import-file').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)importSave(f)};
$('#cam-reset').onclick=()=>{
 R.cam={theta:.78,phi:1.02,radius:26};
 R.target={x:0,z:0};
 if(R.ok)updateCam();
 toast('視点をもどしたよ!');
};
$('#pan-toggle').onclick=()=>{
 R.dragMode=R.dragMode==='pan'?'orbit':'pan';
 $('#pan-toggle').textContent=R.dragMode==='pan'?'🖐️':'🔄';
 toast(R.dragMode==='pan'?'ドラッグで街をスライドできるよ!':'ドラッグで視点をまわすモードにしたよ');
 refreshSceneHint();
};
$('#title-grade').querySelectorAll('.grade-card').forEach(button=>{button.onclick=()=>switchGrade(button.dataset.grade)});
$('#reset-btn-top').onclick=()=>askYesNo(gradeLabel(activeGrade)+'のデータをけす?','この級の街と記録が消えて、この級は最初からになります。他の級の記録は残るけどいい?','消して最初から',wipeAndRestart);
$('#sound-btn').onclick=()=>{state.sound=!state.sound;save();refreshHUD();if(state.sound)sfx('coin')};
$('#home-btn').onclick=goHome;
$('#res-town-btn').onclick=goHome;

(function init(){
 state=loadState();
 freshStart=!loadBlocked&&!state;
 if(loadBlocked){
  state=freshState(activeGrade);
 }else if(!state){
  state=freshState(activeGrade);
 }
 try{
  if(freshStart&&window.matchMedia&&matchMedia('(pointer:coarse)').matches){
   state.lowGfx=true;
  }
 }catch(e){}
 refreshHUD();
 refreshNameUI();
 renderStats();
})();
