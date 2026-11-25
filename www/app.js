// Hafızım - çevrimdışı çalışan hafızlık asistanı
const API='https://api.alquran.cloud/v1',AUD='https://cdn.islamic.network/quran/audio/128/';
const $=s=>document.querySelector(s),V=$('#view'),SH=$('#sheet'),AU=$('#au');
let S=JSON.parse(localStorage.getItem('hafizim')||'null')||{page:1,ed:'ar.alafasy',rate:1,reps:3,pages:{},errs:{},hide:false,only:false};
const save=()=>localStorage.setItem('hafizim',JSON.stringify(S));
// IndexedDB önbelleği
const db=new Promise(r=>{const q=indexedDB.open('hafizim',1);q.onupgradeneeded=()=>q.result.createObjectStore('c');q.onsuccess=()=>r(q.result)});
const idb=async(m,k,v)=>{const d=await db;return new Promise(r=>{const t=d.transaction('c',m==='get'?'readonly':'readwrite').objectStore('c');const q=m==='get'?t.get(k):t.put(v,k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(Promise.reject(q.error))})};
async function cached(k,url){let v=await idb('get',k);if(v)return v;const j=await (await fetch(url)).json();v=j.data;await idb('put',k,v);return v}
const getPage=n=>cached('p'+n,`${API}/page/${n}/quran-uthmani`);
const getMeal=n=>cached('m'+n,`${API}/page/${n}/tr.diyanet`);
const getAll=()=>cached('all',`${API}/quran/quran-uthmani`);
const BSM='بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const words=a=>{let w=a.text.split(' ');if(a.numberInSurah===1&&a.surface!==1&&a.surah.number!==1&&a.surah.number!==9)w=w.slice(4);return w};
const norm=t=>t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/[ٱأإآ]/g,'ا').replace(/[ىي]/g,'ي');
const tabs={mushaf,today,quiz,stats:list,set:settings};let cur='mushaf',P=null,sel=null,loop={},playing=false;
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.t));
function go(t){stopAudio();cur=t;document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));SH.hidden=true;tabs[t]()}
const net=()=>$('#net').textContent=navigator.onLine?'':'çevrimdışı';addEventListener('online',net);addEventListener('offline',net);net();
const errCount=n=>Object.values(S.errs).filter(e=>e.page===n).length;
// ---------- MUSHAF ----------
async function mushaf(){
V.innerHTML=`<div class="bar"><button id="pv">‹</button><input id="pn" type="number" min="1" max="604" value="${S.page}" style="width:70px"><button id="nx">›</button><button id="sr" class="b2">Sureler</button>
<select id="tg"><option value="">Etiket yok</option><option value="ham">Ham (Yeni)</option><option value="taze">Taze Has</option><option value="eski">Eski Has</option></select>
<button id="hd" class="b2">${S.hide?'Perde: AÇIK':'Perde: kapalı'}</button></div>
<div class="bar"><select id="ed"><option value="ar.alafasy">Mishary Alafasy</option><option value="ar.husary">Husari</option><option value="ar.minshawi">Minşavi</option></select>
<select id="rt"><option>0.75</option><option>1</option><option>1.25</option><option>1.5</option><option>1.75</option><option>2</option></select>
<select id="rp"><option value="1">1x</option><option value="3">3x</option><option value="5">5x</option><option value="10">10x</option><option value="20">20x</option><option value="0">∞</option></select>
<button id="pl" class="b">▶ Aralığı oku</button><button id="tr" class="b2">Sayfa geçişi (meal)</button></div>
<div id="pg" class="page">Yükleniyor…</div><div id="lp" class="tr"></div>`;
$('#sr').onclick=surahs;$('#pn').onchange=e=>{S.page=Math.min(604,Math.max(1,+e.target.value||1));save();mushaf()};
$('#pv').onclick=()=>{if(S.page>1){S.page--;save();mushaf()}};$('#nx').onclick=()=>{if(S.page<604){S.page++;save();mushaf()}};
$('#tg').value=(S.pages[S.page]||{}).tag||'';$('#tg').onchange=e=>{const p=S.pages[S.page]||(S.pages[S.page]={last:0});if(e.target.value)p.tag=e.target.value;else delete S.pages[S.page];save()};
$('#hd').onclick=()=>{S.hide=!S.hide;save();mushaf()};
$('#ed').value=S.ed;$('#ed').onchange=e=>{S.ed=e.target.value;save()};$('#rt').value=S.rate;$('#rt').onchange=e=>{S.rate=+e.target.value;save()};$('#rp').value=S.reps;$('#rp').onchange=e=>{S.reps=+e.target.value;save()};
$('#pl').onclick=()=>{if(playing){stopAudio();return}const l=P.ayahs,a=l.findIndex(x=>x.number===loop.a),b=l.findIndex(x=>x.number===loop.b);
 const s=a<0?0:a,e=b<0?l.length-1:Math.max(a,b);playSeq(l.slice(Math.min(s,e),e+1),S.reps)};
$('#tr').onclick=transition;
try{P=await getPage(S.page)}catch{$('#pg').textContent='Bu sayfa henüz indirilmedi. İnternete bağlanıp bir kez açın; sonra çevrimdışı çalışır.';return}
let h='',lastS=0;
for(const a of P.ayahs){if(a.numberInSurah===1&&a.surah.number!==lastS){h+=`<div style="text-align:center;color:var(--g);font-weight:700">﴿ ${a.surah.name} ﴾</div>`;lastS=a.surah.number}
 const w=words(a),k=`${a.surah.number}:${a.numberInSurah}`,er=S.errs[a.number]?' err':'';
 const ws=w.map((x,i)=>`<span class="w" data-i="${i}">${x}</span>`);
 const body=S.hide?ws[0]+`<span class="rest"> ${ws.slice(1).join(' ')}</span>`:ws.join(' ');
 h+=`<span class="a${er}${S.hide?' hide':''}" data-n="${a.number}"> ${body} <span class="n">${a.numberInSurah}</span></span>`}
$('#pg').innerHTML=h;
$('#pg').onclick=e=>{const el=e.target.closest('.a');if(!el)return;const w=e.target.closest('.w');
 if(S.hide&&!el.classList.contains('show')){el.classList.add('show');return}
 document.querySelectorAll('.sw').forEach(x=>x.classList.remove('sw'));document.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));
 el.classList.add('sel');if(w)w.classList.add('sw');sel={n:+el.dataset.n,w:w?+w.dataset.i:null,wt:w?w.textContent:''};ayahSheet()};
}
function ayahSheet(){const a=P.ayahs.find(x=>x.number===sel.n),er=S.errs[sel.n];
SH.hidden=false;SH.innerHTML=`<div class="bar"><b>${a.surah.englishName} ${a.numberInSurah}</b><span class="tag">Cüz ${a.juz}</span><button id="x" style="margin-left:auto">✕</button></div>
<div class="bar"><button class="b" id="s1">▶ Dinle</button><button class="b2" id="s2">Döngü başı</button><button class="b2" id="s3">Döngü sonu</button><button class="b2" id="s4">Meal</button><button class="b2" id="s5">Benzer ayetler</button></div>
<div id="o"></div><div class="card"><b>Hata / zayıf nokta</b>${sel.w!==null?`<div class="ar">${sel.wt}</div>`:''}
<textarea id="nt" rows="2" style="width:100%" placeholder="Kısa not">${er?er.note||'':''}</textarea>
<div class="bar"><button class="b" id="er">İşaretle</button>${er?'<button id="ce">Kaldır</button>':''}</div></div>`;
$('#x').onclick=()=>SH.hidden=true;$('#s1').onclick=()=>playSeq([a],S.reps);
$('#s2').onclick=()=>{loop.a=a.number;toast('Başlangıç seçildi')};$('#s3').onclick=()=>{loop.b=a.number;toast('Bitiş seçildi')};
$('#s4').onclick=async()=>{const m=(await getMeal(S.page).catch(()=>null));const t=m&&m.ayahs.find(x=>x.number===a.number);$('#o').innerHTML=`<div class="card tr">${t?t.text:'Meal için internet gerekli (bir kez indirilince offline çalışır).'}</div>`};
$('#s5').onclick=()=>similar(a);
$('#er').onclick=()=>{const o=S.errs[a.number]||{page:S.page,count:0};o.count++;o.note=$('#nt').value;o.page=S.page;if(sel.w!==null)o.word=sel.wt;o.ts=Date.now();S.errs[a.number]=o;save();SH.hidden=true;mushaf()};
if($('#ce'))$('#ce').onclick=()=>{delete S.errs[a.number];save();SH.hidden=true;mushaf()}}
function toast(t){$('#lp').textContent=t}
// ---------- SES ----------
function stopAudio(){playing=false;AU.pause();document.querySelectorAll('.play').forEach(x=>x.classList.remove('play'));const b=$('#pl');if(b)b.textContent='▶ Aralığı oku'}
function playSeq(list,reps){stopAudio();playing=true;const b=$('#pl');if(b)b.textContent='■ Durdur';let r=0,i=0;
 const next=()=>{if(!playing)return;if(i>=list.length){i=0;r++;if(reps&&r>=reps){stopAudio();return}}
  const a=list[i++];document.querySelectorAll('.play').forEach(x=>x.classList.remove('play'));const el=document.querySelector(`.a[data-n="${a.number}"]`);if(el){el.classList.add('play');el.scrollIntoView({block:'center',behavior:'smooth'})}
  (async()=>{let u=`${AUD}${S.ed}/${a.number}.mp3`;try{const bl=await idb('get',`a:${S.ed}:${a.number}`);if(bl)u=URL.createObjectURL(bl)}catch{}AU.src=u;AU.playbackRate=S.rate;AU.play().catch(()=>{toast('Ses için internet gerekli');stopAudio()})})()};
 AU.onended=next;next()}
// ---------- ANLAM KÖPRÜSÜ ----------
async function transition(){SH.hidden=false;SH.innerHTML='<button id="x">✕</button><div id="o">Yükleniyor…</div>';$('#x').onclick=()=>SH.hidden=true;
try{const m=await getMeal(S.page),l=m.ayahs[m.ayahs.length-1],p=S.page<604?await getMeal(S.page+1):null,f=p&&p.ayahs[0];
$('#o').innerHTML=`<div class="card"><b>Sayfa sonu (${S.page})</b><div class="tr">${l.text}</div></div>`+(f?`<div class="card"><b>Sonraki sayfa başı (${S.page+1})</b><div class="tr">${f.text}</div></div>`:'')}catch{$('#o').textContent='Meal için internet gerekli.'}}
// ---------- MÜTEŞABİHAT ----------
function lcs(a,b){const n=a.length,m=b.length,d=Array.from({length:n+1},()=>new Uint8Array(m+1));
for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=a[i]===b[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
const pa=[],i0=[];let i=0,j=0;while(i<n&&j<m){if(a[i]===b[j]){pa.push([i,j]);i++;j++}else if(d[i+1][j]>=d[i][j+1])i++;else j++}return{len:d[0][0],pairs:pa}}
async function similar(a){$('#o').innerHTML='<div class="card">Taranıyor… (ilk seferde tüm Kur\'an indirilir)</div>';
let all;try{all=await getAll()}catch{$('#o').innerHTML='<div class="card">İlk kullanımda internet gerekli.</div>';return}
const flat=all.surahs.flatMap(s=>s.ayahs.map(x=>({...x,surah:s})));
const ta=norm(words(a).join(' ')).split(' '),sa=new Set(ta),res=[];
for(const b of flat){if(b.number===a.number)continue;if(S.only&&!S.pages[b.page])continue;
 const tb=norm(words({...b,surah:b.surah}).join(' ')).split(' ');let c=0;for(const x of tb)if(sa.has(x))c++;if(c/Math.max(ta.length,tb.length)<.5)continue;
 const L=lcs(ta,tb),r=L.len/Math.max(ta.length,tb.length);if(r>=.6)res.push({b,tb,L,r})}
res.sort((x,y)=>y.r-x.r);const top=res.slice(0,4);const wa=words(a);
const mark=(raw,t,idx)=>raw.map((w,i)=>{const p=idx.get(i);return `<span class="${p===undefined?'df':(p!==w?'df':'')}">${w}</span>`}).join(' ');
let h=`<div class="bar"><label><input type="checkbox" id="on" ${S.only?'checked':''}> Sadece ezberlediğim sayfalar</label></div><div class="card"><div class="tag">Seçili ayet</div><div class="ar">${wa.join(' ')}</div></div>`;
if(!top.length)h+='<div class="card">Benzer ayet bulunamadı.</div>';
for(const {b,L} of top){const rb=words({...b,surah:b.surah});const ma=new Map(),mb=new Map();
 L.pairs.forEach(([i,j])=>{ma.set(i,wa[i]===rb[j]?wa[i]:null);mb.set(j,wa[i]===rb[j]?rb[j]:null)});
 const hl=(raw,m)=>raw.map((w,i)=>`<span class="${m.has(i)&&m.get(i)!==null?'':'df'}">${w}</span>`).join(' ');
 h+=`<div class="card"><div class="tag">${b.surah.englishName} ${b.numberInSurah} · sayfa ${b.page}</div><div class="ar">${hl(wa,ma)}</div><div class="ar">${hl(rb,mb)}</div></div>`}
$('#o').innerHTML=h;$('#on').onchange=e=>{S.only=e.target.checked;save();similar(a)}}
// ---------- TEKRAR ----------
function today(){const now=Date.now(),W={ham:3,taze:2,eski:1};
const L=Object.entries(S.pages).map(([n,p])=>({n:+n,p,sc:errCount(+n)*3+((now-(p.last||0))/864e5>400?400:(now-(p.last||0))/864e5)*W[p.tag]})).sort((a,b)=>b.sc-a.sc).slice(0,10);
V.innerHTML='<h3>Bugün tekrar et</h3>'+(L.length?L.map(x=>`<div class="card"><b>Sayfa ${x.n}</b> <span class="tag">${{ham:'Ham',taze:'Taze Has',eski:'Eski Has'}[x.p.tag]}</span> <span class="tag">hata: ${errCount(x.n)}</span> <span class="tag">${x.p.last?Math.floor((now-x.p.last)/864e5)+' gün önce':'hiç tekrar edilmedi'}</span>
<div class="bar"><button class="b" data-o="${x.n}">Aç</button><button class="b2" data-d="${x.n}">Tekrar ettim ✓</button></div></div>`).join(''):'<div class="card">Mushaf ekranında sayfalara Ham / Taze Has / Eski Has etiketi verin.</div>');
V.onclick=e=>{const o=e.target.dataset.o,d=e.target.dataset.d;if(o){S.page=+o;save();go('mushaf')}if(d){S.pages[d].last=Date.now();save();today()}}}
// ---------- TEST ----------
async function quiz(){const ps=Object.keys(S.pages).map(Number);
V.innerHTML='<h3>Mini test</h3>'+(ps.length?'<div class="bar"><button class="b" id="q1">Devamını getir</button><button class="b" id="q2">Hangi sayfa / cüz?</button></div><div id="q"></div>':'<div class="card">Önce sayfa etiketleyin.</div>');if(!ps.length)return;
const pick=async()=>{const n=ps[Math.random()*ps.length|0],p=await getPage(n).catch(()=>null);if(!p){$('#q').innerHTML='<div class="card">Bu sayfa için internet gerekli.</div>';return null}return{n,a:p.ayahs[Math.random()*p.ayahs.length|0]}};
$('#q1').onclick=async()=>{const r=await pick();if(!r)return;const w=words(r.a);$('#q').innerHTML=`<div class="card"><div class="ar">${w.slice(0,3).join(' ')} …</div><button class="b2" id="rv">Devamını göster</button><div id="fl"></div></div>`;
 $('#rv').onclick=()=>{$('#fl').innerHTML=`<div class="ar">${w.join(' ')}</div><div class="bar"><button class="b" id="ok">Bildim</button><button id="no">Bilemedim</button></div>`;$('#ok').onclick=()=>$('#q1').click();$('#no').onclick=()=>{const o=S.errs[r.a.number]||{page:r.n,count:0};o.count++;o.page=r.n;o.note='Test: bilemedi';S.errs[r.a.number]=o;save();$('#q1').click()}}};
$('#q2').onclick=async()=>{const r=await pick();if(!r)return;const o=new Set([r.n]);while(o.size<4)o.add(1+Math.random()*604|0);const opts=[...o].sort(()=>Math.random()-.5);
 $('#q').innerHTML=`<div class="card"><div class="ar">${words(r.a).join(' ')}</div><p>Bu ayet kaçıncı sayfada?</p><div class="bar">${opts.map(x=>`<button data-x="${x}">${x}</button>`).join('')}</div><div id="fl"></div></div>`;
 $('#q').onclick=e=>{const x=e.target.dataset.x;if(!x)return;$('#fl').innerHTML=(+x===r.n?'✅ Doğru':'❌ Doğrusu: '+r.n)+` — Cüz ${r.a.juz}. <button class="b" id="nx2">Sonraki</button>`;$('#nx2').onclick=()=>$('#q2').click()}}}
// ---------- LİSTE / YEDEK ----------
function list(){const E=Object.entries(S.errs);
V.innerHTML=`<h3>Ezber durumu</h3><div class="card">Etiketli sayfa: ${Object.keys(S.pages).length} · İşaretli hata: ${E.length}</div>
${E.map(([n,e])=>`<div class="card">Sayfa ${e.page} ${e.word?`<span class="ar" style="font-size:20px">${e.word}</span>`:''} <span class="tag">${e.count}x</span><div>${e.note||''}</div></div>`).join('')}
<div class="bar"><button class="b2" id="ex">Yedek indir (JSON)</button><label class="b2" style="padding:8px 10px;border-radius:8px">Yedek yükle<input id="im" type="file" hidden></label></div>`;
$('#ex').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));a.download='hafizim-yedek.json';a.click()};
$('#im').onchange=async e=>{try{S=JSON.parse(await e.target.files[0].text());save();list()}catch{alert('Geçersiz dosya')}}}
// ---------- GECE MODU ----------
const nm=()=>{document.body.classList.toggle('night',!!S.night);$('#nm').textContent=S.night?'☀️':'🌙'};$('#nm').onclick=()=>{S.night=!S.night;save();nm()};nm();
// ---------- SURELER ----------
const SN="Fâtiha,Bakara,Âl-i İmrân,Nisâ,Mâide,En'âm,A'râf,Enfâl,Tevbe,Yûnus,Hûd,Yûsuf,Ra'd,İbrâhîm,Hicr,Nahl,İsrâ,Kehf,Meryem,Tâhâ,Enbiyâ,Hac,Mü'minûn,Nûr,Furkân,Şuarâ,Neml,Kasas,Ankebût,Rûm,Lokmân,Secde,Ahzâb,Sebe',Fâtır,Yâsîn,Sâffât,Sâd,Zümer,Mü'min,Fussilet,Şûrâ,Zuhruf,Duhân,Câsiye,Ahkâf,Muhammed,Fetih,Hucurât,Kâf,Zâriyât,Tûr,Necm,Kamer,Rahmân,Vâkıa,Hadîd,Mücâdele,Haşr,Mümtehine,Saff,Cuma,Münâfikûn,Teğâbün,Talâk,Tahrîm,Mülk,Kalem,Hâkka,Meâric,Nûh,Cin,Müzzemmil,Müddessir,Kıyâme,İnsan,Mürselât,Nebe',Nâziât,Abese,Tekvîr,İnfitâr,Mutaffifîn,İnşikâk,Bürûc,Târık,A'lâ,Gâşiye,Fecr,Beled,Şems,Leyl,Duhâ,İnşirâh,Tîn,Alak,Kadr,Beyyine,Zilzâl,Âdiyât,Kâria,Tekâsür,Asr,Hümeze,Fîl,Kureyş,Mâûn,Kevser,Kâfirûn,Nasr,Mesed,İhlâs,Felak,Nâs".split(',');
const SP=[1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
const n$=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f'’]/g,'').replace(/ı/g,'i');
function surahs(){SH.hidden=false;SH.innerHTML='<div class="bar"><input id="sq" placeholder="Sure adı veya no" style="flex:1"><button id="x">✕</button></div><div id="sl"></div>';
const f=()=>{const q=n$($('#sq').value.trim());$('#sl').innerHTML=SN.map((s,i)=>[s,i]).filter(([s,i])=>!q||n$(s).includes(q)||String(i+1)===q).map(([s,i])=>`<div class="card" data-p="${SP[i]}"><b>${i+1}. ${s}</b> <span class="tag">sayfa ${SP[i]}</span></div>`).join('')};
f();$('#sq').oninput=f;$('#x').onclick=()=>SH.hidden=true;$('#sl').onclick=e=>{const c=e.target.closest('[data-p]');if(c){S.page=+c.dataset.p;save();SH.hidden=true;mushaf()}}}
// ---------- AYARLAR / TOPTAN İNDİRME ----------
const RC={'ar.alafasy':['Mishary Alafasy',420e6],'ar.husary':['Husari',330e6],'ar.minshawi':['Minşavi',520e6]},est={};
const fmt=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':Math.round(b/1e6)+' MB';let stopDl=false;
async function sample(e){let t=0,c=0;for(const n of [1,300,900,1500,2200,2900,3600,4300,5000,5700,6200]){try{const r=await fetch(`${AUD}${e}/${n}.mp3`,{method:'HEAD'});const l=+r.headers.get('content-length');if(l){t+=l;c++}}catch{}}return c>3?t/c*6236:RC[e][1]}
async function dlText(p){p.textContent='Metin indiriliyor…';const A=await (await fetch(API+'/quran/quran-uthmani')).json(),M=await (await fetch(API+'/quran/tr.diyanet')).json();
const mk=(D,full)=>{const pg={};D.data.surahs.forEach(s=>s.ayahs.forEach(x=>{(pg[x.page]=pg[x.page]||{ayahs:[]}).ayahs.push(full?{...x,surah:{number:s.number,name:s.name,englishName:s.englishName}}:{number:x.number,text:x.text})}));return pg};
const P1=mk(A,1),P2=mk(M,0);await idb('put','all',A.data);for(const n in P1){await idb('put','p'+n,{ayahs:P1[n].ayahs});await idb('put','m'+n,{ayahs:P2[n].ayahs})}S.textDone=true;save();p.textContent='✅ İndirildi'}
async function dlAudio(eds,pr,ps){const u=[];eds.forEach(e=>{for(let i=1;i<=6236;i++)u.push([e,i])});let d=0,bad=0,err='';stopDl=false;const it=u[Symbol.iterator]();pr.max=u.length;
await Promise.all([1,2,3].map(async()=>{for(const [e,n] of it){if(stopDl)return;const k=`a:${e}:${n}`;try{if(!(await idb('get',k))){const r=await fetch(`${AUD}${e}/${n}.mp3`);if(!r.ok)throw new Error('HTTP '+r.status);const b=await r.blob();if(b.size<1000)throw new Error('boş dosya');await idb('put',k,b)}}catch(x){bad++;err=err||(x&&(x.name+' '+x.message))||'bilinmeyen hata'}d++;if(d%10===0){pr.value=d;ps.textContent=`${d} / ${u.length} dosya`+(bad?` · hata: ${bad} (${err})`:'')}}}));pr.value=d;
ps.textContent=stopDl?'Durduruldu. Tekrar basınca kaldığı yerden devam eder.':(bad?`Bitti ama ${bad} dosya inmedi (ilk hata: ${err}). Tekrar basın.`:'✅ Tüm sesler indirildi, artık internet gerekmez.')}
async function settings(){V.innerHTML=`<h3>Ayarlar</h3><div class="card"><label><input type="checkbox" id="ni" ${S.night?'checked':''}> Gece modu</label></div>
<div class="card"><b>1) Metin + Diyanet meali + müteşabihat verisi</b><p class="tr" id="ts">${S.textDone?'✅ İndirildi':'Yaklaşık 10 MB'}</p><button class="b" id="dt">Metni indir</button></div>
<div class="card"><b>2) Sesler (tüm Kur'an)</b><p class="tr">Boyutlar tahminidir. Mobil veri kullanmamak için Wi‑Fi'a bağlanıp indir. Yarıda kalırsa tekrar basınca devam eder.</p><div id="rc"></div><p class="tr" id="tot"></p>
<progress id="pr" value="0" max="1" style="width:100%"></progress><div class="tr" id="ps"></div><div class="bar"><button class="b" id="da">Seçili sesleri indir</button><button id="ds">Durdur</button></div></div><div class="card tr" id="st"></div>`;
$('#ni').onchange=e=>{S.night=e.target.checked;save();nm()};
$('#rc').innerHTML=Object.entries(RC).map(([e,[n,v]])=>`<label style="display:block;margin:6px 0"><input type="checkbox" class="rk" value="${e}" ${e===S.ed?'checked':''}> ${n} <span class="tag" id="z${e.replace('.','')}">~${fmt(v)}</span></label>`).join('');
const tot=()=>{let t=0;document.querySelectorAll('.rk:checked').forEach(k=>t+=est[k.value]||RC[k.value][1]);$('#tot').textContent='Seçili toplam ses boyutu: '+fmt(t)};
document.querySelectorAll('.rk').forEach(k=>k.onchange=tot);tot();
Object.keys(RC).forEach(async e=>{est[e]=await sample(e);const z=$('#z'+e.replace('.',''));if(z)z.textContent=fmt(est[e]);if(cur==='set')tot()});
$('#dt').onclick=()=>dlText($('#ts')).catch(()=>$('#ts').textContent='Hata: internet bağlantısını kontrol et');
$('#da').onclick=()=>{const e=[...document.querySelectorAll('.rk:checked')].map(k=>k.value);if(!e.length)return;navigator.storage&&navigator.storage.persist&&navigator.storage.persist();dlAudio(e,$('#pr'),$('#ps'))};
$('#ds').onclick=()=>stopDl=true;
if(navigator.storage&&navigator.storage.estimate){const x=await navigator.storage.estimate();$('#st').textContent=`Cihazda kullanılan alan: ${fmt(x.usage)} / ${fmt(x.quota)}`}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
go('mushaf');
