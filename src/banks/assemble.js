for(const grade of ['4','5','3','pre2','2','pre1']){
 QUESTION_BANKS[grade].park=PRACTICE_LISTENING_DATA[grade].map(([part,d,segments,q,c,a,e,scene],i)=>({
  id:`g${grade}-park-${101+i}`,d,kind:'listening',part,segments,q,c,a,e,
  ...(scene?{scene,picture:PRACTICE_PICTURES[scene]}:{})
 }));
}
for(const [rg,genre,n,questions] of PRACTICE_READING_DATA){
 const group=`g${rg}-reading-${genre}-${n}`;
 const d={notice:1,email:2,story:3}[genre];
 for(const [q,c,a,e] of questions)QUESTION_BANKS[rg].flower.push({
  id:`g${rg}-flower-${101+QUESTION_BANKS[rg].flower.length}`,d,kind:'reading',group,genre,
  passage:PRACTICE_PASSAGES[group],q,c,a,e
 });
}
for(const [rg,genre,n,questions] of PRACTICE_CLOZE_DATA){
 const group=`g${rg}-cloze-${genre}-${n}`;
 const d={notice:1,email:2,story:3}[genre];
 for(const [q,c,a,e] of questions)QUESTION_BANKS[rg].station.push({
  id:`g${rg}-station-${101+QUESTION_BANKS[rg].station.length}`,d,kind:'reading',group,genre,
  passage:PRACTICE_PASSAGES[group],q,c,a,e
 });
}
for(const grade of ['4','5','3','pre2','2']){
 QUESTION_BANKS[grade].station=PRACTICE_ORDER_DATA[grade].map(([jp,units,order,prefix,suffix,e],i)=>{
  const positions=grade==='5'?[1,3]:[2,4];
  const answer=positions.map(p=>order[p-1]);
  const pairs=[];
  for(let n=1;n<=units.length&&pairs.length<3;n++)for(let m=1;m<=units.length&&pairs.length<3;m++)if(n!==m&&(n!==answer[0]||m!==answer[1]))pairs.push([n,m]);
  const a=(i+1)%4;
  pairs.splice(a,0,answer);
  return{id:`g${grade}-station-${101+i}`,d:1+Math.floor((i%18)/6),kind:'order-pair',jp,units,order,positions,prefix,suffix,pairs,a,e};
 });
}
