const CAT={L:{n:"Liviana",dep:20000},M:{n:"Media",dep:50000},P:{n:"Pesada",dep:100000}};
const MOD=[
{id:"tal",n:"Taladro percutor",c:"L",p:4500,u:["TAL-01","TAL-02","TAL-03"]},
{id:"ama",n:"Amoladora 115 mm",c:"L",p:3800,u:["AMO-01","AMO-02"]},
{id:"hid",n:"Hidrolavadora",c:"M",p:9000,u:["HID-01","HID-02"]},
{id:"esc",n:"Escalera extensible",c:"M",p:5000,u:["ESC-01","ESC-02"]},
{id:"mez",n:"Mezcladora de cemento",c:"P",p:14000,u:["MEZ-01"]},
{id:"sol",n:"Soldadora inverter",c:"P",p:12000,u:["SOL-01"]}];
const EST={conf:"Confirmada",ret:"Retirada",dev:"Devuelta",cancel:"Cancelada",noret:"No retirada"};
const def=()=>({now:"2026-11-18T10:00",fer:["2026-12-08"],users:{ana:{n:"Ana (cliente)",v:false,f:[],b:""},beto:{n:"Beto (Vecino)",v:true,f:[],b:""}},res:[],deu:[],av:[],mant:{},nid:1});
function load(){try{const x=localStorage.getItem("pt1");if(x)return JSON.parse(x)}catch(e){}return def()}
function save(){try{localStorage.setItem("pt1",JSON.stringify(S))}catch(e){}}
let S=load(),who="visitante",tab="cat",msg=null;
const g=x=>document.getElementById(x);
const P2=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+P2(d.getMonth()+1)+"-"+P2(d.getDate());
const fm=d=>iso(d)+"T"+P2(d.getHours())+":"+P2(d.getMinutes());
const T=s=>new Date(s+"T12:00");
const ad=(s,n)=>{const d=T(s);d.setDate(d.getDate()+n);return iso(d)};
const df=(a,b)=>Math.round((T(b)-T(a))/864e5);
const hoy=()=>S.now.slice(0,10);
const hora=()=>+S.now.slice(11,13)+ +S.now.slice(14,16)/60;
const hab=s=>T(s).getDay()!==0&&!S.fer.includes(s);
const sab=s=>T(s).getDay()===6;
const rng=(a,b)=>{const o=[];for(let d=a;d<b;d=ad(d,1))o.push(d);return o};
const rd=x=>Math.floor(x+.5+1e-9);
const $$=n=>"$"+Number(n).toLocaleString("es-AR");
const mod=id=>MOD.find(m=>m.id===id);
const nextHab=s=>{while(!hab(s))s=ad(s,1);return s};

function precio(m,a,b,v){const c=rng(a,b).filter(hab);let s=0;c.forEach(d=>s+=m.p*(sab(d)?1.2:1));
 const du=c.length>=5?.2:c.length>=3?.1:0;return rd(s*(1-du)*(v?.85:1))}
const libre=(m,a,b)=>m.u.find(u=>!S.mant[u]&&!S.res.some(r=>r.u===u&&(r.e==="conf"||r.e==="ret")&&a<r.b&&r.a<b));
function aviso(k,t){S.av.push({u:k,t,f:S.now})}
function deuda(k,m,t){S.deu.push({id:S.nid++,u:k,m,t,ok:false});aviso(k,"Cargo registrado: "+$$(m)+" ("+t+")")}

function reservar(uid,mid,a,b){
 const u=S.users[uid],m=mod(mid);
 if(!u)return "Iniciá sesión como cliente para reservar.";
 if(u.b&&u.b>hoy())return "Estás bloqueado hasta el "+u.b+" por 3 faltas en 60 días.";
 if(S.deu.some(d=>d.u===uid&&!d.ok))return "Tenés una deuda impaga. Pagala en el mostrador para reservar.";
 if(!a||!b||b<=a)return "Elegí fechas válidas: la devolución es posterior al retiro.";
 if(!hab(a)||!hab(b))return "Solo se retira y se devuelve en días hábiles (no domingos ni feriados).";
 if(m.c==="P"&&!u.v)return "Las herramientas pesadas son solo para Vecinos.";
 const n=df(a,b);
 if(n>(m.c==="P"?3:7))return "Máximo "+(m.c==="P"?3:7)+" días para esta herramienta.";
 if(a<ad(hoy(),1))return "Hay que reservar con al menos 1 día de anticipación.";
 const mx=u.v?30:14;if(a>ad(hoy(),mx))return "Se reserva hasta "+mx+" días antes.";
 if(S.res.filter(r=>r.k===uid&&(r.e==="conf"||r.e==="ret")).length>=(u.v?4:2))return "Llegaste al máximo de alquileres activos ("+(u.v?4:2)+").";
 const un=libre(m,a,b);if(!un)return "No quedan unidades libres en esas fechas.";
 S.res.push({id:S.nid++,k:uid,m:mid,u:un,a,b,p:precio(m,a,b,u.v),e:"conf"});
 aviso(uid,"Reserva confirmada: "+m.n+" ("+un+")");return ""}

function cancelar(id){
 const r=S.res.find(x=>x.id===id),h=(new Date(r.a+"T14:00")-new Date(S.now))/36e5;
 if(h<=0)return "Ya no se puede cancelar: pasaron las 14:00 del día de inicio.";
 const pc=h>=48?0:h>=24?.2:.5;r.e="cancel";
 if(pc)deuda(r.k,rd(r.p*pc),"cancelación tardía #"+r.id+", "+pc*100+"%");else aviso(r.k,"Reserva #"+r.id+" cancelada sin cargo");return ""}

function retirar(id,dep){
 const r=S.res.find(x=>x.id===id);
 if(r.a!==hoy()||S.now<r.a+"T14:00"||S.now>=r.a+"T18:00")return "El retiro es el día de inicio, de 14:00 a 18:00.";
 if(!dep)return "Registrá que recibiste el depósito para entregar la herramienta.";
 r.e="ret";return ""}

function devolver(id,es,dano){
 const r=S.res.find(x=>x.id===id),m=mod(r.m);let n=0;
 for(let d=r.b;d<=hoy();d=ad(d,1)){if(hab(d)&&(d<hoy()||hora()>13))n++}
 n=Math.min(n,7);r.e="dev";
 if(n)deuda(r.k,rd(n*1.5*m.p),"atraso de "+n+" día(s) en #"+r.id);
 if(es==="dan"){const mxd=CAT[m.c].dep,c=Math.min(Math.max(+dano||0,0),mxd);S.mant[r.u]=true;
  aviso(r.k,"Unidad dañada: cargo de "+$$(c)+" descontado del depósito; se devuelven "+$$(mxd-c))}
 return ""}

function proceso(){
 S.res.forEach(r=>{if(r.e==="conf"&&S.now>=r.a+"T18:00"){
  r.e="noret";deuda(r.k,rd(r.p*.5),"no retiro #"+r.id+", 50%");
  const u=S.users[r.k];u.f.push(r.a);u.f=u.f.filter(f=>df(f,hoy())<=60);
  if(u.f.length>=3){u.b=ad(hoy(),30);u.f=[];aviso(r.k,"Quedaste bloqueado hasta el "+u.b+" (3 faltas en 60 días)")}}})}

function acts(r){
 const m=mod(r.m);
 if(r.e==="conf"&&r.a===hoy())return `<div class="row"><label><input type="checkbox" id="dp${r.id}"> Depósito ${$$(CAT[m.c].dep)} recibido</label><button data-a="ret" data-id="${r.id}">Registrar retiro</button></div>`;
 if(r.e==="ret")return `<div class="row"><select id="es${r.id}"><option value="ok">Buen estado</option><option value="des">Desgaste normal</option><option value="dan">Dañada</option></select><input type="number" id="dn${r.id}" min="0" max="${CAT[m.c].dep}" placeholder="Cargo por daño"><button data-a="dev" data-id="${r.id}">Registrar devolución</button></div>`;
 return "";}
const item=(r,adm,own)=>{const m=mod(r.m);return `<div class="item"><h3>${m.n} <span class="st">${EST[r.e]}</span></h3>
<div class="mu">#${r.id} · ${adm?S.users[r.k].n+" · ":""}${r.u} · retiro ${r.a} 14:00 · devolución ${r.b} 12:00</div>
<div class="q">${$$(r.p)}</div>${adm?acts(r):""}${own&&r.e==="conf"?`<div class="row"><button class="g" data-a="can" data-id="${r.id}">Cancelar reserva</button></div>`:""}</div>`};

function cat(){
 const u=S.users[who],a=nextHab(ad(hoy(),2)),b=nextHab(ad(a,2));
 return `<h2>Catálogo</h2><div class="grid">`+MOD.map(m=>{const lib=m.u.filter(x=>!S.mant[x]).length;return `<div class="card"><h3>${m.n}</h3>
<div class="mu">${CAT[m.c].n} · ${lib} de ${m.u.length} unidades · depósito ${$$(CAT[m.c].dep)}</div>
<div class="row"><span class="tag">${$$(m.p)}</span><span class="mu">por día</span></div>
<div class="row"><input type="date" id="fi${m.id}" value="${a}" data-q="${m.id}"><input type="date" id="ff${m.id}" value="${b}" data-q="${m.id}"></div>
<div class="q" id="q${m.id}"></div>
<div class="row"><button data-a="res" data-m="${m.id}">Reservar</button></div></div>`}).join("")+`</div>
<p class="mu">${u?"Reservás como "+u.n+(u.v?" (15% de descuento y más límites)":"")+".":"Podés ver todo; para reservar elegí un usuario arriba."} Retiro desde las 14:00 y devolución hasta las 12:00.</p>`}

function mis(){
 if(!S.users[who])return `<h2>Mis reservas</h2><p class="mu">Elegí Ana o Beto en el selector de usuario.</p>`;
 const l=S.res.filter(r=>r.k===who).reverse();
 return `<h2>Mis reservas</h2>`+(l.length?l.map(r=>item(r,false,true)).join(""):`<p class="mu">Todavía no reservaste nada. Elegí una herramienta en el catálogo.</p>`)}

function cta(){
 const u=S.users[who];if(!u)return `<h2>Cuenta</h2><p class="mu">Elegí Ana o Beto en el selector de usuario.</p>`;
 const d=S.deu.filter(x=>x.u===who&&!x.ok),av=S.av.filter(x=>x.u===who).reverse();
 return `<h2>Deudas</h2>`+(d.length?d.map(x=>`<div class="item">${$$(x.m)} · ${x.t}</div>`).join("")+`<p class="mu">Se pagan en el mostrador.</p>`:`<p class="mu">No tenés deudas.</p>`)+
 `<h2>Estado</h2><div class="item">${u.b&&u.b>hoy()?`<span class="er">Bloqueado hasta el ${u.b}.</span>`:"Sin bloqueos."} Faltas en los últimos 60 días: ${u.f.length}.</div>
<h2>Avisos</h2>`+(av.length?av.map(x=>`<div class="item">${x.t}<div class="mu">${x.f.replace("T"," ")}</div></div>`).join(""):`<p class="mu">Sin avisos.</p>`)}

function dia(){
 const h=hoy(),R=S.res,ret=R.filter(r=>r.e==="conf"&&r.a===h),dv=R.filter(r=>r.e==="ret"&&r.b===h),at=R.filter(r=>r.e==="ret"&&r.b<h);
 const L=(t,l)=>`<h2>${t}</h2>`+(l.length?l.map(r=>item(r,true)).join(""):`<p class="mu">Nada por ahora.</p>`);
 return L("Retiros de hoy",ret)+L("Devoluciones de hoy",dv)+L("Atrasadas",at)}
function resv(){return `<h2>Todas las reservas</h2>`+(S.res.length?S.res.slice().reverse().map(r=>item(r,true)).join(""):`<p class="mu">Todavía no hay reservas.</p>`)}
function cfg(){
 const d=S.deu.filter(x=>!x.ok);
 return `<h2>Feriados</h2><div class="row">${S.fer.map(f=>`<span class="st">${f} <a href="#" data-a="fq" data-f="${f}" class="er">quitar</a></span>`).join(" ")}<input type="date" id="nf" class="row"><button data-a="fa">Agregar feriado</button></div>
<h2>Vecinos</h2>`+Object.keys(S.users).map(k=>`<div class="item">${S.users[k].n} · ${S.users[k].v?"Vecino":"Cliente común"} <div class="row"><button class="g" data-a="vec" data-k="${k}">${S.users[k].v?"Quitar condición de Vecino":"Marcar como Vecino (DNI verificado)"}</button></div></div>`).join("")+
 `<h2>Deudas impagas</h2><div class="row"><input type="text" id="mot" placeholder="Motivo para condonar"></div>`+(d.length?d.map(x=>`<div class="item">${S.users[x.u].n} · ${$$(x.m)} · ${x.t}<div class="row"><button data-a="pag" data-id="${x.id}">Marcar pagada</button><button class="g" data-a="con" data-id="${x.id}">Condonar</button></div></div>`).join(""):`<p class="mu">No hay deudas impagas.</p>`)}

function render(){
 g("who").innerHTML=`<option value="visitante">Visitante</option>`+Object.keys(S.users).map(k=>`<option value="${k}">${S.users[k].n}</option>`).join("")+`<option value="admin">Administrador</option>`;
 g("who").value=who;g("now").value=S.now;
 const adm=who==="admin",tabs=adm?[["dia","Panel del día"],["res","Reservas"],["cfg","Gestión"]]:[["cat","Catálogo"],["mis","Mis reservas"],["cta","Cuenta"]];
 if(!tabs.some(t=>t[0]===tab))tab=tabs[0][0];
 g("app").innerHTML=`<nav>`+tabs.map(t=>`<button class="${t[0]===tab?"on":""}" data-a="tab" data-t="${t[0]}">${t[1]}</button>`).join("")+`</nav>`+
 (msg?`<div class="toast ${msg.t}">${msg.x}</div>`:"")+({cat,mis,cta,dia,res:resv,cfg}[tab])();
 msg=null;document.querySelectorAll("[data-q]").forEach(i=>quote(i.dataset.q));
}
function quote(id){
 const a=g("fi"+id).value,b=g("ff"+id).value,m=mod(id),u=S.users[who],q=g("q"+id);
 if(!a||!b||b<=a){q.textContent="";return}
 q.textContent="Total: "+$$(precio(m,a,b,u&&u.v))+" · "+df(a,b)+" día(s) de alquiler"}

document.addEventListener("click",e=>{
 const b=e.target.closest("[data-a]");if(!b)return;e.preventDefault();
 const a=b.dataset.a,id=+b.dataset.id;let er="",ok="Listo.";
 if(a==="tab"){tab=b.dataset.t;render();return}
 if(a==="h"||a==="d"){S.now=fm(new Date(new Date(S.now).getTime()+(a==="h"?36e5:864e5)));ok="Reloj: "+S.now.replace("T"," ")}
 else if(a==="res"){const m=b.dataset.m;er=reservar(who,m,g("fi"+m).value,g("ff"+m).value);if(!er){ok="Reserva confirmada.";tab="mis"}}
 else if(a==="can"){er=cancelar(id);ok="Reserva cancelada."}
 else if(a==="ret"){er=retirar(id,g("dp"+id).checked);ok="Retiro registrado."}
 else if(a==="dev"){er=devolver(id,g("es"+id).value,g("dn"+id).value);ok="Devolución registrada."}
 else if(a==="fa"){const f=g("nf").value;if(!f)er="Elegí una fecha.";else if(!S.fer.includes(f))S.fer.push(f);S.fer.sort();ok="Feriado cargado."}
 else if(a==="fq"){S.fer=S.fer.filter(f=>f!==b.dataset.f);ok="Feriado quitado."}
 else if(a==="vec"){const u=S.users[b.dataset.k];u.v=!u.v;ok="Condición actualizada. Las reservas ya hechas no cambian."}
 else if(a==="pag"){S.deu.find(x=>x.id===id).ok=true;ok="Deuda marcada como pagada."}
 else if(a==="con"){const mo=g("mot").value.trim();if(!mo)er="Escribí el motivo para condonar.";else S.deu.find(x=>x.id===id).ok=true;ok="Deuda condonada: "+mo}
 proceso();msg=er?{t:"er",x:er}:{t:"ok",x:ok};save();render()});
document.addEventListener("input",e=>{if(e.target.dataset.q)quote(e.target.dataset.q)});
g("who").addEventListener("change",e=>{who=e.target.value;tab=who==="admin"?"dia":"cat";render()});
g("now").addEventListener("change",e=>{if(e.target.value){S.now=e.target.value;proceso();save()}render()});
proceso();render();