const {test} = require('node:test');
const assert = require('node:assert/strict');
const api = require('./biblioteca-email.js');
const now = Date.parse('2026-09-23T18:00:00Z');
const work = {id:'stable-id',titulo:'Uma obra <especial>',autor:'Autor & família',ano:1967,createdAt:new Date(now-1000)};
test('quinzena usa publicação, exclui limites, rascunhos e datas futuras',()=>{
 const works=[work,{...work,id:'old',createdAt:now-15*86400000},{...work,id:'future',createdAt:now+1},
 {...work,id:'draft',status:'draft'},{titulo:'Sem data',ano:2026},{...work,id:'updated',createdAt:now-30*86400000,updatedAt:now},
 {...work,id:'firestore',createdAt:{seconds:now/1000-2}}];
 assert.deepEqual(api.recentWorks(works,now).map(w=>w.id),['stable-id','firestore']);
});
test('título, autor, data, escaping, imagens detalhadas e links internos',()=>{
 const m=api.message({type:'new',works:[work]});
 assert.equal(m.subject,work.titulo);
 assert.match(m.html,/Uma obra &lt;especial&gt;/);
 assert.match(m.html,/Autor &amp; família/);
 assert.match(m.html,/23\/09\/2026/);
 assert.match(m.html,/new-detail.jpg/);
 assert.match(m.html,/\?obra=stable-id/);
 assert.doesNotMatch(m.html,/<script|undefined/);
 assert.match(m.text,/1967|23\/09\/2026/);
});
test('resumo somente dos últimos 15 dias e estado vazio',()=>{
 const m=api.message({type:'fortnight',now,works:[work,{...work,titulo:'Antiga',createdAt:now-20*86400000}]});
 assert.match(m.html,/Uma obra &lt;especial&gt;/);assert.doesNotMatch(m.html,/Antiga/);
 assert.match(api.message({type:'fortnight',now,works:[]}).html,/não houve novas publicações/);
});
test('três modelos e destinos seguros',()=>{
 for(const type of ['welcome','new','fortnight']) assert.match(api.message({type,works:[work],now}).html,new RegExp(type+'-detail.jpg'));
 assert.equal(api.workUrl({...work,codigo:225}),'https://rdcguardandomomentos.com.br/?obra=stable-id');
 assert.equal(api.safeUrl('https://example.org'),'https://rdcguardandomomentos.com.br/');
 assert.match(api.workUrl({titulo:'A & B',url:'https://evil.test'}),/titulo=A\+%26\+B/);
});
test('link por ID aguarda obra carregada e não abre uma obra de mesmo código',()=>{
 const {install}=require('./obra-link.js');let cards=[],callback,clicked=0,disconnected=0;
 const doc={documentElement:{},querySelectorAll:()=>cards,querySelector:()=>({scrollIntoView(){}})};
 const win={MutationObserver:class{constructor(fn){callback=fn}observe(){}disconnect(){disconnected++}},setTimeout:()=>0};
 const card=id=>({dataset:{cloudId:id},querySelector:s=>s.includes('a.read-button')?{getAttribute:()=>'/file.pdf',click:()=>clicked++}:{textContent:'225'},scrollIntoView(){}});
 install(doc,win,'?obra=right-id&codigo=225');
 cards=[card('wrong-id')];callback();assert.equal(clicked,0);
 cards.push(card('right-id'));callback();callback();assert.equal(clicked,1);assert.equal(disconnected,1);
});
