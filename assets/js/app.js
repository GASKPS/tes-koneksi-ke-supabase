/* Tampilan dan alur aplikasi; sumber data dipilih melalui config.js. */
const CONFIG = window.MESS_CONFIG || {};
const DEMO = CONFIG.mode === "demo";
const SUPABASE_URL = CONFIG.supabaseUrl || "";
const SUPABASE_KEY = CONFIG.supabaseKey || "";
const NIK_DOMAIN = CONFIG.nikDomain || "kps.local";
const ZONE = CONFIG.timezone || "Asia/Jayapura";
const BEDDING = [["selimut","Selimut"],["bantal_kepala","Bantal kepala"],["bantal_guling","Bantal guling"],["sarung_bantal","Sarung bantal"],["seprai","Seprai"]];
const MENUS = [
  ["beranda","Beranda","home","Lihat ringkasan hunian dan pekerjaan yang perlu diselesaikan."],
  ["karyawan","Karyawan","people","Cari nama atau NIK, lalu lihat dan atur penempatan karyawan."],
  ["kamar","Kamar","room","Lihat penghuni, tempat tidur kosong, dan kondisi setiap kamar."],
  ["riwayat","Riwayat","history","Lihat catatan perpindahan dan data yang pernah dihapus."],
  ["laporan","Laporan","chart","Lihat jumlah penghuni berdasarkan lokasi dan departemen."],
  ["pindahan","Pengantaran","move","Tandai selesai setelah karyawan diantar ke kamar tujuannya."],
  ["resign","Karyawan keluar","exit","Catat karyawan yang keluar kerja, barang kembali, dan potongannya."],
  ["profil","Profil & Pengaturan","user","Ubah profil, kata sandi, akun, dan daftar barang."]
];
const S = {user:null,profile:null,employees:[],rooms:[],roomMap:{},assets:[],tools:[],pending:[],recent:[],history:null,deletions:null,
  page:"beranda",pages:{},filters:{karyawan:{q:"",company:"",gender:"",housing:"",sort:"nama"},kamar:{location:"",block:"",status:""},riwayat:{q:"",mode:"pindah"},pindahan:{q:""},resign:{q:""},laporan:{company:""}},dirty:false,profileDirty:false,modal:null,coreSeq:0,navSeq:0};
const $ = id => document.getElementById(id);
const E = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const admin = () => ["admin","super_admin"].includes(S.profile?.role);
const superAdmin = () => S.profile?.role==="super_admin";
const canCreateAccounts = () => superAdmin();
// Nilai database tetap sama; Administrator adalah hak akses tertinggi.
const roleName = role => ({pengguna:"Pengguna",admin:"Super Admin",super_admin:"Administrator"}[role]||"Pengguna");
const norm = value => String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const compare = (a,b) => String(a??"").localeCompare(String(b??""),"id",{numeric:true,sensitivity:"base"});
const code = value => /^\d+$/.test(String(value).trim()) ? (String(value).trim().replace(/^0+/,"")||"0") : norm(value);
const rupiah = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
const roomLabel = r => r ? `${r.lokasi_hunian} · Blok ${r.block} · Kamar ${r.no_kamar}` : "Belum ditempatkan";
const dateText = value => !value ? "—" : new Intl.DateTimeFormat("id-ID",{timeZone:ZONE,day:"2-digit",month:"short",year:"numeric"}).format(new Date(value.length===10?value+"T12:00:00+09:00":value));
const timeText = value => !value ? "—" : new Intl.DateTimeFormat("id-ID",{timeZone:ZONE,day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
function today(){const parts=new Intl.DateTimeFormat("en",{timeZone:ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;}
function safeURL(value){try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch{return "";}}
function resmi(r){return !!r.tgl_masuk_mess && BEDDING.every(([key])=>r.perlengkapan?.[key]===true);}
function initials(value){return String(value||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase().slice(0,2);}
function setting(key,fallback){try{return localStorage.getItem((DEMO?"mess-simple-demo-":"mess-simple-")+key)||fallback;}catch{return fallback;}}
function remember(key,value){try{localStorage.setItem((DEMO?"mess-simple-demo-":"mess-simple-")+key,value);}catch{}}
if(setting("theme","light")==="dark")document.body.classList.add("dark");
function theme(){document.body.classList.toggle("dark");remember("theme",document.body.classList.contains("dark")?"dark":"light");}
let toastTimer;
function toast(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,4200);}
function errorText(error){
  if(["PGRST202","PGRST205","42P01","42883"].includes(error?.code))return "Database belum siap digunakan. Hubungi admin untuk menyelesaikan pemasangan.";
  if(error?.code==="42501")return "Akun Anda belum memiliki izin untuk tindakan ini. Hubungi admin.";
  if(error?.code==="23505")return "Data dengan identitas ini sudah terdaftar.";
  if(/Failed to fetch|NetworkError|fetch failed/i.test(error?.message||""))return "Koneksi terputus. Periksa internet dan coba lagi.";
  return error?.message||"Tindakan gagal. Coba lagi.";
}
function showError(id,error){$(id).textContent=errorText(error);$(id).hidden=false;}
function hideError(id){$(id).hidden=true;$(id).textContent="";}
async function result(query){const value=await query;if(value.error)throw value.error;return value.data;}
async function rpc(name,args={}){return result(sb.rpc("mess_"+name,args));}
async function readAll(table,{select="*",order="id",ascending=true,where=null}={}){
  const rows=[];let offset=0;const size=500;
  while(true){let q=sb.from("mess_"+table).select(select).order(order,{ascending});if(where)q=where(q);
    const chunk=await result(q.range(offset,offset+size-1));rows.push(...(chunk||[]));
    if(!chunk||chunk.length<size)break;offset+=size;
  }return rows;
}
async function loadCore(){
  const seq=++S.coreSeq;
  const [employees,rooms,assets,tools,pending,recent]=await Promise.all([
    readAll("employees",{order:"nik"}),readAll("room_status"),
    readAll("assets",{order:"id"}),readAll("tools",{order:"id"}),
    readAll("moves",{ascending:false,where:q=>q.eq("diantar",false).eq("dibatalkan",false)}),
    result(sb.from("mess_moves").select("*").order("id",{ascending:false}).limit(5))
  ]);
  if(seq!==S.coreSeq)return false;
  S.employees=employees;S.rooms=rooms;S.assets=assets.sort((a,b)=>a.urutan-b.urutan||a.id-b.id);S.tools=tools.sort((a,b)=>a.urutan-b.urutan||a.id-b.id);S.pending=pending;S.recent=recent||[];
  S.roomMap=Object.fromEntries(rooms.map(r=>[r.id,r]));
  S.employees.forEach(r=>{r._search=norm([r.nama,r.nik,r.department,r.jabatan,r.perusahaan,roomLabel(S.roomMap[r.kamar_id])].join(" "));r._words=r._search.split(" ");});
  S.history=null;S.deletions=null;return true;
}
async function refresh(silent=false){
  hideError("globalError");
  try{S.profile=await rpc("profile");if(await loadCore()){renderIdentity();await navigate(S.page,false);if(!silent)toast("Data diperbarui.");}}
  catch(error){showError("globalError",error);throw error;}
}
async function renderIdentity(){
  $("sideName").textContent=S.profile.nama||S.profile.email?.split("@")[0]||"Pengguna";
  $("sideRole").textContent=roleName(S.profile.role);
  const initial=initials(S.profile.nama||S.profile.email);
  ["sideAvatar","topAvatar","profileAvatar"].forEach(id=>{if($(id))$(id).textContent=initial;});
  if(S.profile.avatar_path){
    const userId=S.user.id,path=S.profile.avatar_path;
    try{const d=await result(sb.storage.from("mess-avatars").createSignedUrl(path,3600));const u=DEMO&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(d.signedUrl)?d.signedUrl:safeURL(d.signedUrl);
      if(S.user?.id!==userId||S.profile?.avatar_path!==path)return;
      if(u)["sideAvatar","topAvatar","profileAvatar"].forEach(id=>{if($(id))$(id).innerHTML=`<img src="${E(u)}" alt="Foto profil">`;});
    }catch{/* Avatar bukan penghalang pembacaan data. */}
  }
}
async function enterApp(user){
  S.user=user;S.profile=await rpc("profile");await loadCore();
  $("loginScreen").hidden=true;$("app").hidden=false;$("logoutOnError").hidden=true;
  updateHeader();await renderIdentity();await navigate(setting("page","beranda"));
}
function setLoginBusy(busy){
  const btn=$("loginButton");btn.disabled=busy||!sb;btn.setAttribute("aria-busy",String(busy));
  btn.innerHTML=busy?'<span class="spin" aria-hidden="true"></span> Sedang masuk…':"Masuk";
}
function togglePassword(){
  const input=$("loginPassword"),show=input.type==="password";input.type=show?"text":"password";
  $("showPassword").textContent=show?"Sembunyikan":"Lihat";
  $("showPassword").setAttribute("aria-label",show?"Sembunyikan kata sandi":"Tampilkan kata sandi");
  $("showPassword").setAttribute("aria-pressed",String(show));input.focus();
}
function loginErrorText(error){
  const message=error?.message||"";
  if(/invalid login credentials/i.test(message))return "Email atau NIK dan kata sandi tidak cocok. Periksa lalu coba lagi.";
  if(/email not confirmed/i.test(message))return "Email akun belum dikonfirmasi. Hubungi admin untuk mengaktifkan akun.";
  if(/too many|rate limit|over_request_rate_limit/i.test(message))return "Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.";
  return errorText(error);
}
async function login(event){
  event.preventDefault();hideError("loginError");setLoginBusy(true);
  try{
    if(!sb)throw new Error("Login belum siap. Muat ulang halaman atau hubungi admin.");
    const name=$("loginUser").value.trim(),password=$("loginPassword").value;
    if(!name||!password)throw new Error("Isi email atau NIK dan kata sandi terlebih dahulu.");
    const {data,error}=await sb.auth.signInWithPassword({email:name.includes("@")?name:name+"@"+NIK_DOMAIN,password});
    if(error)throw new Error(loginErrorText(error));
    $("loginPassword").value="";$("loginPassword").type="password";
    $("showPassword").textContent="Lihat";$("showPassword").setAttribute("aria-pressed","false");$("showPassword").setAttribute("aria-label","Tampilkan kata sandi");
    await enterApp(data.user);
  }catch(error){showError("loginError",error);$("logoutOnError").hidden=!S.user;}
  finally{setLoginBusy(false);}
}
async function logout(){if((S.dirty||S.profileDirty)&&!confirm("Ada perubahan yang belum disimpan. Tetap keluar?"))return;
  const {error}=await sb.auth.signOut();if(error)throw error;S.user=null;S.profile=null;S.employees=[];S.rooms=[];S.history=null;S.dirty=false;S.profileDirty=false;closeDialog(true);
  $("app").hidden=true;$("loginScreen").hidden=false;$("logoutOnError").hidden=true;hideError("loginError");$("loginPassword").value="";
}
function actionButton(action,label,style="",data=""){return `<button class="btn ${style}" data-action="${action}" ${data}>${label}</button>`;}
function detailButton(nik,name){return `<button class="text-btn" data-action="detail" data-nik="${E(nik)}">${E(name)}</button>`;}
function empty(message="Belum ada data.",hint=""){return `<div class="empty"><strong>${E(message)}</strong>${E(hint)}</div>`;}
function badge(text,type=""){return `<span class="badge ${type}">${E(text)}</span>`;}
function filterSelect(group,key,options,placeholder,value){
  return `<select class="input" aria-label="${E(placeholder)}" data-filter="${group}" data-key="${key}"><option value="">${E(placeholder)}</option>${options.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${E(v)}" ${String(value)===String(v)?"selected":""}>${E(l)}</option>`;}).join("")}</select>`;
}
function searchInput(group,placeholder){return `<input class="input search" data-filter="${group}" data-key="q" aria-label="${E(placeholder)}" placeholder="${E(placeholder)}" value="${E(S.filters[group].q)}">`;}
function pagination(key,total,per=25){
  const pages=Math.max(1,Math.ceil(total/per));S.pages[key]=Math.min(Math.max(S.pages[key]||1,1),pages);const current=S.pages[key],start=(current-1)*per;
  return {start,end:start+per,html:`<div class="pager"><span>${total?start+1:0}–${Math.min(start+per,total)} dari ${total} data</span><div><button class="btn sm" data-action="page" data-list="${key}" data-number="${current-1}" ${current<=1?"disabled":""}>Sebelumnya</button><span>${current} / ${pages}</span><button class="btn sm" data-action="page" data-list="${key}" data-number="${current+1}" ${current>=pages?"disabled":""}>Berikutnya</button></div></div>`};
}
function table(headers,body){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${E(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;}
function td(value,cls=""){return `<td class="${cls}">${E(value??"—")}</td>`;}
function dataCard(headers,rows,key,rowHTML){
  if(!rows.length)return `<div class="card">${empty("Tidak ada data yang cocok.","Coba ubah kata kunci atau filter.")}</div>`;
  const p=pagination(key,rows.length);return `<div class="card">${table(headers,rows.slice(p.start,p.end).map(rowHTML).join(""))}${p.html}</div>`;
}
async function navigate(page,save=true){
  const meta=MENUS.find(m=>m[0]===page)||MENUS[0];S.page=meta[0];const seq=++S.navSeq;if(save)remember("page",S.page);
  $("pageTitle").textContent=meta[1];$("pageDescription").textContent=meta[3];$("pageActions").innerHTML="";
  $("nav").innerHTML=MENUS.map(([key,label,i])=>`<button data-action="nav" data-page="${key}" class="${key===S.page?"active":""}" ${key===S.page?'aria-current="page"':""}>${icon(i)}${label}${key==="pindahan"&&S.pending.length?` <span class="badge">${S.pending.length}</span>`:""}</button>`).join("");
  hideError("globalError");
  try{
    if(S.page==="riwayat"){
      $("pageContent").innerHTML=empty("Memuat riwayat…");
      if(S.filters.riwayat.mode==="hapus"&&admin()){if(!S.deletions)S.deletions=await readAll("deletions",{select:"id,jenis,ref,nama,detail,oleh_email,waktu",ascending:false});}
      else {S.filters.riwayat.mode="pindah";if(!S.history)S.history=await readAll("moves",{ascending:false});}
    }
    if(seq!==S.navSeq)return;
    ({beranda:renderHome,karyawan:renderEmployees,kamar:renderRooms,riwayat:renderHistory,laporan:renderReport,pindahan:renderPending,resign:renderResign,profil:renderProfile}[S.page])();
  }catch(error){if(seq===S.navSeq){showError("globalError",error);$("pageContent").innerHTML=empty("Data belum dapat dimuat.","Gunakan tombol perbarui untuk mencoba lagi.");}}
}
function renderHome(){
  const active=S.employees.filter(x=>x.status==="aktif"),total=S.rooms.reduce((n,r)=>n+r.jumlah_bed,0),
    occupied=S.rooms.reduce((n,r)=>n+r.terisi,0),free=S.rooms.reduce((n,r)=>n+r.sisa,0),
    pct=total?Math.round(occupied/total*100):0,without=active.filter(x=>!x.kamar_id).length,
    damaged=S.rooms.filter(r=>r.rusak).length,full=S.rooms.filter(r=>r.status_kamar==="FULL").length;
  const stats=[
    {label:"Karyawan aktif",n:active.length,i:"people",note:active.filter(x=>x.kamar_id).length+" menempati mess"},
    {label:"Total kamar",n:S.rooms.length,i:"room",note:full+" penuh · "+S.rooms.filter(r=>r.status_kamar==="KOSONG").length+" kosong"},
    {label:"Tempat tidur kosong",n:free,i:"bed",color:"green",note:"Dari "+total+" kapasitas tempat tidur"},
    {label:"Menunggu diantar",n:S.pending.length,i:"move",color:"amber",note:"Penempatan yang perlu diproses"}
  ];
  const locations=[...new Set(S.rooms.map(r=>r.lokasi_hunian))].sort(compare),byCompany={};
  active.forEach(r=>{const k=r.perusahaan||"Tanpa perusahaan";byCompany[k]=(byCompany[k]||0)+1;});
  const moves=S.recent.map(m=>{
    const emp=S.employees.find(x=>x.nik===m.nik);
    return `<tr>${td(timeText(m.waktu),"nowrap")}<td>${detailButton(m.nik,emp?.nama||m.nik)}<span class="subline">${E(m.nik)}</span></td>${td(m.ke_label||"Keluar mess")}<td>${badge(m.dibatalkan?"Dibatalkan":m.diantar?"Selesai":"Menunggu",m.dibatalkan?"":m.diantar?"ok":"warn")}</td></tr>`;
  }).join("");
  const follow=(count,label,page,focus="")=>`<button class="followup" data-action="nav" data-page="${page}" data-focus="${focus}"><span><span class="count">${count}</span>${label}</span>${icon("arrow-right")}</button>`;
  $("pageActions").innerHTML=admin()?actionButton("employee-add",icon("plus")+"Tambah karyawan","primary"):"";
  const firstSteps=superAdmin()&&(!S.rooms.length||!S.employees.length)?`<div class="getting-started"><h2>Mulai dari sini</h2><p>Isi data awal agar ringkasan hunian mulai terisi.</p><div class="start-steps">
    <button class="start-step" data-action="nav" data-page="kamar"><span class="step-number">1</span><span><strong>Tambahkan kamar</strong><small>Isi lokasi dan jumlah tempat tidur.</small></span></button>
    <button class="start-step" data-action="nav" data-page="karyawan"><span class="step-number">2</span><span><strong>Catat karyawan</strong><small>Isi nama, NIK, dan jenis kelamin.</small></span></button>
    <button class="start-step" data-action="help"><span class="step-number">3</span><span><strong>Atur penempatan</strong><small>Pilih kamar dan tempat tidur kosong.</small></span></button>
    </div></div>`:"";
  $("pageContent").innerHTML=`
    ${firstSteps}<div class="stats">${stats.map(s=>`<div class="stat"><div class="stat-top"><span>${s.label}</span><span class="stat-icon ${s.color||""}">${icon(s.i)}</span></div><b>${s.n.toLocaleString("id-ID")}</b><div class="stat-note">${s.note}</div></div>`).join("")}</div>
    <div class="stack">
      <div class="dashboard-grid">
        <div class="card occupancy-card"><div class="card-head"><h2>Tingkat hunian</h2>${badge("Seluruh lokasi")}</div><div class="card-body">
          <div class="occupancy-numbers"><strong>${pct}%</strong><span>${occupied} dari ${total} tempat tidur terisi</span></div>
          <div class="progress" role="progressbar" aria-label="Tingkat hunian" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          <div class="occupancy-legend"><span><i class="dot"></i>${occupied} tempat tidur terisi</span><span><i class="dot empty-dot"></i>${free} tempat tidur kosong</span></div>
        </div></div>
        <div class="card"><div class="card-head"><h2>Perlu ditindaklanjuti</h2>${icon("check")}</div><div class="followups">
          ${follow(S.pending.length,"Menunggu diantar","pindahan")}${follow(without,"Belum punya kamar","karyawan","unplaced")}${follow(damaged,"Kamar dengan kerusakan","kamar","damaged")}
        </div></div>
      </div>
      <div class="columns">
        <div class="card"><div class="card-head"><h2>Hunian per lokasi</h2><button class="text-btn" data-action="nav" data-page="kamar">Lihat kamar</button></div><div class="card-body">
          ${locations.map(l=>{const rs=S.rooms.filter(r=>r.lokasi_hunian===l),used=rs.reduce((n,r)=>n+r.terisi,0),capacity=rs.reduce((n,r)=>n+r.jumlah_bed,0);
            return `<div class="location-row"><div class="summary-line"><span>${E(l)}</span><strong class="mono">${used} <span class="muted">/ ${capacity} tempat tidur</span></strong></div><div class="progress"><span style="width:${capacity?used/capacity*100:0}%"></span></div></div>`;}).join("")||'<p class="muted">Belum ada kamar.</p>'}
        </div></div>
        <div class="card"><div class="card-head"><h2>Karyawan per perusahaan</h2><button class="text-btn" data-action="nav" data-page="laporan">Lihat laporan</button></div><div class="card-body">
          ${Object.entries(byCompany).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="summary-line"><span>${E(c)}</span><strong class="mono">${n}</strong></div>`).join("")||'<p class="muted">Belum ada karyawan.</p>'}
          <div class="gender-line"><span><b>${active.filter(x=>x.gender==="L").length}</b> Laki-laki</span><span><b>${active.filter(x=>x.gender==="P").length}</b> Perempuan</span>${active.some(x=>!x.gender)?`<span><b>${active.filter(x=>!x.gender).length}</b> Belum diisi</span>`:""}</div>
        </div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Perpindahan terbaru</h2><button class="text-btn" data-action="nav" data-page="riwayat">Lihat riwayat</button></div>
        ${moves?table(["Waktu","Karyawan","Tujuan","Status"],moves):empty("Belum ada perpindahan.")}
      </div>
    </div>`;
}
function lev(a,b,max=2){
  if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i),before=null;
  for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++){
    cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]!==b[j-1]));
    if(before&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],before[j-2]+1);
  }before=prev;prev=cur;}return prev[b.length];
}
function matchScore(row,tokens){
  let score=0;for(const t of tokens){if(row._search.includes(t)){score+=3;continue;}const max=t.length>=7?2:t.length>=4?1:0;
    if(!max||!row._words.some(w=>lev(t,w,max)<=max))return -1;score++;
  }if(tokens.length&&norm(row.nama).startsWith(tokens[0]))score+=2;return score;
}
function employeeRows(){
  const f=S.filters.karyawan;let rows=S.employees.filter(r=>r.status==="aktif"&&(!f.company||r.perusahaan===f.company)&&(!f.gender||r.gender===f.gender)&&(!f.housing||(f.housing==="ada"?r.kamar_id:!r.kamar_id)));
  const tokens=norm(f.q).split(" ").filter(Boolean);
  if(tokens.length){rows=rows.map(r=>({r,score:matchScore(r,tokens)})).filter(x=>x.score>=0).sort((a,b)=>f.sort==="nik"?compare(a.r.nik,b.r.nik):b.score-a.score||compare(a.r.nama,b.r.nama)).map(x=>x.r);}
  else rows=rows.sort((a,b)=>compare(f.sort==="nik"?a.nik:a.nama,f.sort==="nik"?b.nik:b.nama));
  return rows;
}
function renderEmployees(){
  const f=S.filters.karyawan,companies=[...new Set(S.employees.map(r=>r.perusahaan).filter(Boolean))].sort(compare);
  $("pageActions").innerHTML=admin()?actionButton("employee-add",icon("plus")+"Tambah karyawan","primary"):"";
  $("pageContent").innerHTML=`<div class="toolbar">${searchInput("karyawan","Cari nama, NIK, departemen, atau kamar…")}${filterSelect("karyawan","company",companies,"Semua perusahaan",f.company)}${filterSelect("karyawan","gender",[["L","Laki-laki"],["P","Perempuan"]],"Semua jenis kelamin",f.gender)}${filterSelect("karyawan","housing",[["ada","Sudah punya kamar"],["tanpa","Belum punya kamar"]],"Semua penempatan",f.housing)}${filterSelect("karyawan","sort",[["nama","Urut nama"],["nik","Urut NIK"]],"Urutan",f.sort)}</div><div id="employeeTable"></div>`;renderEmployeeTable();
}
function renderEmployeeTable(){
  if(!S.employees.some(r=>r.status==="aktif")){
    $("employeeTable").innerHTML=empty("Belum ada karyawan aktif.",admin()?"Pilih Tambah karyawan untuk mencatat data pertama.":"Data akan muncul setelah ditambahkan oleh admin.");return;
  }
  const rows=employeeRows();
  $("employeeTable").innerHTML=dataCard(["NIK","Nama","Departemen","Jabatan","Lokasi","Blok / Kamar",...(admin()?["Aksi"]:[])],rows,"karyawan",r=>{const room=S.roomMap[r.kamar_id];
    return `<tr>${td(r.nik,"mono nowrap")}<td>${detailButton(r.nik,r.nama)}<span class="subline">${E(r.perusahaan||"")}</span></td>${td(r.department)}${td(r.jabatan)}${td(room?.lokasi_hunian)}${td(room?room.block+" / "+room.no_kamar:"—","nowrap")}${admin()?`<td><div class="row-actions">${actionButton("employee-move","Atur kamar","sm",`data-nik="${E(r.nik)}"`)}${actionButton("employee-edit","Edit","sm",`data-nik="${E(r.nik)}"`)}</div></td>`:""}</tr>`;
  });
}
function renderRooms(){
  const f=S.filters.kamar,locations=[...new Set(S.rooms.map(r=>r.lokasi_hunian))].sort(compare);
  const blocks=[...new Set(S.rooms.filter(r=>!f.location||r.lokasi_hunian===f.location).map(r=>r.block))].sort(compare);
  $("pageActions").innerHTML=superAdmin()?actionButton("room-add",icon("plus")+"Tambah kamar","primary"):"";
  $("pageContent").innerHTML=`<div class="toolbar">${filterSelect("kamar","location",locations,"Semua lokasi",f.location)}${filterSelect("kamar","block",blocks,"Semua blok",f.block)}${filterSelect("kamar","status",[["slot","Ada tempat tidur kosong"],["penuh","Penuh"],["kosong","Kosong"],["rusak","Ada kerusakan"]],"Semua kondisi",f.status)}</div><p class="hint room-help">Pilih nama untuk melihat detail. Label merah berarti tanggal masuk mess atau perlengkapan tidur belum lengkap.</p><div id="roomList"></div>`;renderRoomList();
}
function renderRoomList(){
  const f=S.filters.kamar;const rows=S.rooms.filter(r=>(!f.location||r.lokasi_hunian===f.location)&&(!f.block||code(r.block)===code(f.block))&&(!f.status||(f.status==="slot"?r.sisa>0:f.status==="penuh"?r.status_kamar==="FULL":f.status==="kosong"?r.status_kamar==="KOSONG":r.rusak))).sort((a,b)=>compare(a.lokasi_hunian,b.lokasi_hunian)||compare(a.block,b.block)||compare(a.no_kamar,b.no_kamar));
  if(!rows.length){$("roomList").innerHTML=empty("Belum ada kamar untuk pilihan ini.",superAdmin()?"Tambah kamar atau ubah filter.":"Ubah filter atau hubungi Administrator.");return;}
  const p=pagination("kamar",rows.length,24),byRoom={};S.employees.filter(r=>r.status==="aktif"&&r.kamar_id).forEach(r=>{(byRoom[r.kamar_id]??={})[r.no_bed]=r;});
  $("roomList").innerHTML=`<div class="room-grid">${rows.slice(p.start,p.end).map(r=>{
    const beds=Array.from({length:r.jumlah_bed},(_,i)=>{const bed=i+1,emp=byRoom[r.id]?.[bed];
      return emp?`<button class="bed ${resmi(emp)?"":"unconfirmed"}" data-action="detail" data-nik="${E(emp.nik)}" title="${resmi(emp)?"Kedatangan lengkap":"Kedatangan belum lengkap"}"><span>${bed}</span><span>${E(emp.nama)}</span></button>`:`<${admin()?"button":"div"} class="bed free" ${admin()?`data-action="assign" data-room="${r.id}" data-bed="${bed}"`:""}><span>${bed}</span><span>${admin()?"+ Tempatkan karyawan":"Tempat tidur kosong"}</span></${admin()?"button":"div"}>`;
    }).join("");
    const kb=S.tools.filter(t=>r.kebersihan?.items?.[t.id]?.ambil).length;
    return `<div class="room-card"><div class="room-heading"><strong>Blok ${E(r.block)} · Kamar ${E(r.no_kamar)}</strong>${badge(({FULL:"Penuh",KOSONG:"Kosong",TERISI:"Terisi"})[r.status_kamar],r.status_kamar==="FULL"?"bad":r.status_kamar==="KOSONG"?"ok":"warn")}</div>
      <div class="room-meta">${E(r.lokasi_hunian)}<br>${r.terisi} / ${r.jumlah_bed} tempat tidur · ${r.gender==="L"?"Laki-laki":r.gender==="P"?"Perempuan":"Jenis kelamin belum diisi"} · ${E(r.fasilitas||"—")}${r.golongan?" · Gol "+r.golongan:""}</div>
      ${r.rusak?`<p style="margin:0 0 10px">${badge("Ada kerusakan","bad")}</p>`:""}${r.catatan?`<p class="hint" style="margin:0 0 12px">${E(r.catatan)}</p>`:""}
      <div class="beds">${beds}</div><div class="room-foot"><button class="text-btn" data-action="cleaning" data-room="${r.id}" style="font-size:12px">Alat kebersihan ${kb}/${S.tools.length}</button>${admin()?actionButton("room-edit","Edit","sm",`data-room="${r.id}"`):""}</div></div>`;
  }).join("")}</div>${p.html}`;
}
function matchesText(row,q){const tokens=norm(q).split(" ").filter(Boolean);const text=norm(row);return tokens.every(t=>text.includes(t));}
function renderHistory(){
  const f=S.filters.riwayat;
  $("pageContent").innerHTML=`<div class="toolbar"><button class="btn ${f.mode==="pindah"?"primary":""}" data-action="history-mode" data-mode="pindah">Perpindahan</button>${admin()?`<button class="btn ${f.mode==="hapus"?"primary":""}" data-action="history-mode" data-mode="hapus">Penghapusan</button>`:""}${searchInput("riwayat","Cari nama, NIK, kamar, atau admin…")}</div><div id="historyTable"></div>`;renderHistoryTable();
}
function renderHistoryTable(){
  const f=S.filters.riwayat;
  if(f.mode==="hapus"){
    const rows=(S.deletions||[]).filter(r=>matchesText([r.nama,r.ref,r.detail,r.oleh_email].join(" "),f.q));
    $("historyTable").innerHTML=dataCard(["Waktu","Jenis","Data","Catatan","Oleh"],rows,"riwayat",r=>`<tr>${td(timeText(r.waktu),"nowrap")}${td(r.jenis)}<td><button class="text-btn" data-action="deletion-detail" data-id="${r.id}">${E(r.nama)}</button><div class="hint">${E(r.ref)}</div></td>${td(r.detail)}${td(r.oleh_email)}</tr>`);
  }else{
    const names=Object.fromEntries(S.employees.map(r=>[r.nik,r.nama]));
    const rows=(S.history||[]).filter(r=>matchesText([names[r.nik],r.nik,r.dari_label,r.ke_label,r.oleh_email,r.tipe].join(" "),f.q));
    $("historyTable").innerHTML=dataCard(["Waktu","Karyawan","Dari","Ke","Tipe","Oleh"],rows,"riwayat",r=>`<tr>${td(timeText(r.waktu),"nowrap")}<td>${detailButton(r.nik,names[r.nik]||r.nik)}<div class="hint">${E(r.nik)}</div></td>${td((r.dari_label||"—")+(r.dari_no_bed?" · Tempat tidur "+r.dari_no_bed:""))}${td((r.ke_label||"Keluar mess")+(r.ke_no_bed?" · Tempat tidur "+r.ke_no_bed:""))}<td>${badge(r.tipe)}${r.dibatalkan?' <span class="hint">Dibatalkan</span>':""}</td>${td(r.oleh_email)}</tr>`);
  }
}
function renderPending(){
  $("pageContent").innerHTML=`<div class="toolbar">${searchInput("pindahan","Cari nama, NIK, atau kamar tujuan…")}</div><div id="pendingTable"></div>`;renderPendingTable();
}
function renderPendingTable(){
  if(!S.pending.length){$("pendingTable").innerHTML=empty("Belum ada pengantaran yang menunggu.","Penempatan baru akan muncul di sini sampai ditandai sudah diantar.");return;}
  const names=Object.fromEntries(S.employees.map(r=>[r.nik,r]));
  const rows=S.pending.filter(r=>matchesText([r.nik,names[r.nik]?.nama,r.ke_label].join(" "),S.filters.pindahan.q));
  $("pendingTable").innerHTML=dataCard(["Waktu","Karyawan","Departemen","Dari","Tujuan","Oleh",...(admin()?["Aksi"]:[])],rows,"pindahan",r=>`<tr>${td(timeText(r.waktu),"nowrap")}<td>${detailButton(r.nik,names[r.nik]?.nama||r.nik)}</td>${td(names[r.nik]?.department)}${td(r.dari_label||"Penempatan pertama")}${td(r.ke_label+" · Tempat tidur "+r.ke_no_bed)}${td(r.oleh_email)}${admin()?`<td>${actionButton("delivered",icon("check")+"Sudah diantar","sm",`data-id="${r.id}"`)}</td>`:""}</tr>`);
}
function renderResign(){
  $("pageContent").innerHTML=`<div class="toolbar">${searchInput("resign","Cari nama, NIK, perusahaan, atau alasan…")}</div><div id="resignTable"></div>`;renderResignTable();
}
function renderResignTable(){
  if(!S.employees.some(r=>r.status==="resign")){$("resignTable").innerHTML=empty("Belum ada karyawan yang keluar kerja.","Catat melalui Edit karyawan, lalu pilih status Keluar kerja.");return;}
  const rows=S.employees.filter(r=>r.status==="resign"&&matchesText([r.nama,r.nik,r.perusahaan,r.alasan_resign].join(" "),S.filters.resign.q)).sort((a,b)=>compare(b.tgl_resign,a.tgl_resign));
  $("resignTable").innerHTML=dataCard(["NIK","Karyawan","Departemen","Perusahaan","Tanggal keluar kerja","Alasan","Potongan"],rows,"resign",r=>`<tr>${td(r.nik,"mono")}<td>${detailButton(r.nik,r.nama)}</td>${td(r.department)}${td(r.perusahaan)}${td(dateText(r.tgl_resign),"nowrap")}${td(r.alasan_resign)}${td(rupiah(r.potongan),"mono nowrap")}</tr>`);
}

function renderReport(){
  const f=S.filters.laporan,companies=[...new Set(S.employees.filter(r=>r.status==="aktif"&&r.kamar_id).map(r=>r.perusahaan).filter(Boolean))].sort(compare);
  $("pageActions").innerHTML="";
  $("pageContent").innerHTML=`<div class="toolbar">${filterSelect("laporan","company",companies,"Semua perusahaan",f.company)}</div><div id="reportBody"></div>`;renderReportBody();
}
function renderReportBody(){
  const company=S.filters.laporan.company,rows=S.employees.filter(r=>r.status==="aktif"&&r.kamar_id&&(!company||r.perusahaan===company));
  if(!rows.length){$("reportBody").innerHTML=empty("Belum ada penghuni untuk pilihan ini.");return;}
  const locations=[...new Set(rows.map(r=>S.roomMap[r.kamar_id]?.lokasi_hunian||"Tanpa lokasi"))].sort(compare),groups={},totals={};
  for(const r of rows){const room=S.roomMap[r.kamar_id],loc=room?.lokasi_hunian||"Tanpa lokasi",group=(room?.golongan?"Gol "+room.golongan:"Gol belum diisi")+" · "+(room?.fasilitas||"—");
    totals[loc]=(totals[loc]||0)+1;groups[group]??={total:0,locations:{},departments:{}};const g=groups[group];g.total++;g.locations[loc]=(g.locations[loc]||0)+1;const dept=r.department||"Departemen belum diisi";g.departments[dept]=(g.departments[dept]||0)+1;
  }
  const keys=Object.keys(groups).sort(compare),max=Math.max(...Object.values(totals));
  const cross=keys.map(k=>`<tr>${td(k)}${locations.map(l=>td(groups[k].locations[l]||"—","mono")).join("")}${td(groups[k].total,"mono")}</tr>`).join("")+`<tr class="total-row">${td("TOTAL")}${locations.map(l=>td(totals[l],"mono")).join("")}${td(rows.length,"mono")}</tr>`;
  $("reportBody").innerHTML=`<p class="hint" style="margin-bottom:14px">PT KPS · ${E(company||"Semua perusahaan")} · ${dateText(today())} (WIT)</p>
    <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><div class="stat"><span>Tempat tidur terisi</span><b>${rows.length}</b></div>${locations.map(l=>`<div class="stat"><span>${E(l)}</span><b>${totals[l]}</b></div>`).join("")}</div>
    <div class="stack"><div class="card"><div class="card-head"><h2>Penghuni per lokasi</h2></div><div class="card-body report-bars">${locations.map(l=>`<div><div class="summary-line"><span>${E(l)}</span><strong class="mono">${totals[l]}</strong></div><div class="progress"><span style="width:${totals[l]/max*100}%"></span></div></div>`).join("")}</div></div>
    <div class="card"><div class="card-head"><h2>Rincian golongan dan lokasi</h2></div>${table(["Golongan",...locations,"Total"],cross)}</div>
    <div><h2 style="margin-bottom:13px">Penghuni per departemen</h2><div class="report-grid">${keys.map(k=>`<div class="card"><div class="card-head"><h3>${E(k)}</h3></div>${table(["Departemen","Jumlah"],Object.keys(groups[k].departments).sort(compare).map(d=>`<tr>${td(d)}${td(groups[k].departments[d],"mono")}</tr>`).join("")+`<tr class="total-row">${td("Total")}${td(groups[k].total,"mono")}</tr>`)}</div>`).join("")}</div></div></div>`;
}
function field(name,label,value="",type="text",attributes=""){
  return `<label class="field"><span>${E(label)}</span><input class="input" id="f-${name}" name="${name}" type="${type}" value="${E(value)}" ${attributes}></label>`;
}
function selectField(name,label,options,value="",attributes=""){
  return `<label class="field"><span>${E(label)}</span><select class="input" id="f-${name}" name="${name}" ${attributes}><option value="">Pilih</option>${options.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${E(v)}" ${String(value)===String(v)?"selected":""}>${E(l)}</option>`;}).join("")}</select></label>`;
}
function check(name,label,on,attributes=""){return `<label class="check"><input type="checkbox" name="${name}" ${on?"checked":""} ${attributes}><span>${E(label)}</span></label>`;}
function formFoot(label="Simpan",remove=""){return `<div class="dialog-foot">${remove}<button type="button" class="btn" data-action="close-dialog">Batal</button><button type="submit" class="btn primary" id="dialogSave">${E(label)}</button></div>`;}
function openDialog(title,html,context){
  if(S.profileDirty){
    if(!confirm("Perubahan profil belum disimpan. Lanjut dan buang perubahan profil?"))throw new Error("Simpan profil terlebih dahulu atau batalkan perubahan profil.");
    S.profileDirty=false;if($("f-profile_name"))$("f-profile_name").value=S.profile.nama||"";if($("avatarFile"))$("avatarFile").value="";
  }
  if($("dialog").open)$("dialog").close();S.modal=context;S.dirty=false;hideError("dialogError");$("dialogTitle").textContent=title;$("dialogContent").innerHTML=html;$("dialog").showModal();
}
function closeDialog(force=false){if(!force&&S.modal?.busy){toast("Tunggu sampai pembuatan akun selesai.");return false;}if(!force&&S.dirty&&!confirm("Ada perubahan yang belum disimpan. Tetap tutup?"))return false;const account=S.modal?.kind==="account";$("dialog").close();S.modal=null;S.dirty=false;if(account)$("dialogContent").innerHTML="";return true;}
function detailRow(label,value,raw=false){return `<div class="detail-row"><span>${E(label)}</span><span>${raw?value:E(value||"—")}</span></div>`;}
async function employeeDetail(nik){
  const r=await result(sb.from("mess_employees").select("*").eq("nik",nik).single()),room=S.roomMap[r.kamar_id],isResign=r.status==="resign",url=safeURL(r.link_bukti);
  const basic=[["NIK",r.nik],["Jenis kelamin",r.gender==="L"?"Laki-laki":r.gender==="P"?"Perempuan":"—"],["Departemen",r.department],["Jabatan",r.jabatan],["Golongan",r.gol],["Fasilitas",r.fasilitas],["Perusahaan",r.perusahaan],["Lokasi rekrutmen",r.point_of_hire],["Masuk kerja",dateText(r.tgl_masuk_kerja)],["Masuk mess",dateText(r.tgl_masuk_mess)],["Hunian",roomLabel(room)+(r.no_bed?" · Tempat tidur "+r.no_bed:"")]];
  const snapshot=Array.isArray(r.aset_snapshot)?r.aset_snapshot:[],returned=Array.isArray(r.aset_kembali)?r.aset_kembali:[];
  openDialog(r.nama,`<div style="margin-bottom:12px">${badge(isResign?"Keluar kerja":"Aktif",isResign?"bad":"ok")}</div><div class="detail-list">${basic.map(([k,v])=>detailRow(k,v)).join("")}</div>
    ${isResign?`<div class="section-label">Keluar kerja &amp; pengembalian barang</div><div class="detail-list">${detailRow("Tanggal keluar kerja",dateText(r.tgl_resign))}${detailRow("Alasan",r.alasan_resign)}${detailRow("Dicatat oleh",r.resign_oleh)}${detailRow("Dikembalikan",snapshot.filter(a=>returned.includes(a.id)).map(a=>a.nama).join(", "))}${detailRow("Tidak kembali",snapshot.filter(a=>!returned.includes(a.id)).map(a=>a.nama).join(", "))}${detailRow("Potongan",rupiah(r.potongan))}</div>`:
      `<div class="section-label">Kedatangan &amp; perlengkapan tidur</div><div style="margin-bottom:10px">${badge(resmi(r)?"Kedatangan lengkap":"Kedatangan belum lengkap",resmi(r)?"ok":"bad")}</div><div class="detail-list">${detailRow("Sudah diambil",BEDDING.filter(([key])=>r.perlengkapan?.[key]).map(([,name])=>name).join(", "))}${detailRow("Bukti",url?`<a href="${E(url)}" target="_blank" rel="noopener noreferrer">Buka bukti pengambilan</a>`:"—",true)}</div>`}
    <div class="dialog-foot"><button class="btn" data-action="close-dialog">Tutup</button>${admin()?actionButton("employee-edit",icon("edit")+"Edit","",`data-nik="${E(nik)}"`):""}${admin()&&!isResign?actionButton("employee-move",icon("move")+"Pindahkan","primary",`data-nik="${E(nik)}"`):""}</div>`,{kind:"detail",record:r});
}
async function employeeEdit(nik=null){
  if(!admin())throw new Error("Hanya Super Admin atau Administrator yang dapat mengubah data karyawan.");
  const r=nik?await result(sb.from("mess_employees").select("*").eq("nik",nik).single()):{status:"aktif",perlengkapan:{}};
  const assets=r.status==="resign"?(r.aset_snapshot||[]):S.assets;
  openDialog(nik?"Edit karyawan":"Tambah karyawan",`<form id="dialogForm" data-form="employee">
    <p class="form-intro">Isi NIK dan nama untuk menyimpan data. Pilih jenis kelamin agar karyawan bisa ditempatkan ke kamar yang sesuai.</p>
    <div class="form-grid">${field("nik","NIK",r.nik,"text",'required maxlength="80"')}${field("nama","Nama",r.nama,"text",'required maxlength="200"')}
      ${selectField("gender","Jenis kelamin",[["L","Laki-laki"],["P","Perempuan"]],r.gender)}${field("gol","Golongan",r.gol)}
      ${field("department","Departemen",r.department)}${field("jabatan","Jabatan",r.jabatan)}
      ${field("perusahaan","Perusahaan",r.perusahaan)}${selectField("fasilitas","Fasilitas",["CR","NR"],r.fasilitas)}
      ${field("point_of_hire","Lokasi rekrutmen",r.point_of_hire)}${selectField("status","Status",[["aktif","Aktif"],["resign","Keluar kerja"]],r.status,"required")}
      ${field("tgl_masuk_kerja","Tanggal masuk kerja",r.tgl_masuk_kerja,"date")}${field("tgl_masuk_mess","Tanggal masuk mess",r.tgl_masuk_mess,"date")}
    </div>
    <div id="beddingFields"><div class="section-label">Perlengkapan tidur yang sudah diambil</div><div class="checks">${check("all_bedding","Ambil semua",BEDDING.every(([k])=>r.perlengkapan?.[k]),'data-input="all-bedding"')}${BEDDING.map(([k,n])=>check("bed_"+k,n,r.perlengkapan?.[k],'data-input="bedding"')).join("")}</div><div style="margin-top:14px">${field("link_bukti","Link bukti pengambilan (opsional)",r.link_bukti,"url",'placeholder="https://…"')}</div></div>
    <div id="resignFields" hidden><div class="section-label">Keluar kerja &amp; pengembalian barang</div><div class="form-grid">${field("tgl_resign","Tanggal keluar kerja",r.tgl_resign||today(),"date")}${field("alasan_resign","Alasan keluar kerja",r.alasan_resign)}</div><div class="checks" style="margin-top:15px">${assets.map(a=>`<label class="check" style="justify-content:space-between"><span style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="return_asset" value="${a.id}" data-price="${a.harga}" ${r.status==="resign"?(r.aset_kembali||[]).includes(a.id)?"checked":"":"checked"}>${E(a.nama)}</span><span class="hint">${rupiah(a.harga)}</span></label>`).join("")||'<p class="hint">Daftar barang masih kosong. Atur di Pengaturan.</p>'}</div><div class="summary-line"><strong>Total potongan</strong><strong id="resignCut" style="color:var(--bad)"></strong></div><p class="hint">Potongan dihitung dari barang yang tidak dikembalikan. Saat keluar kerja, tempat tidur akan dikosongkan.</p></div>
    ${formFoot("Simpan",nik?actionButton("employee-delete","Hapus","danger",`data-nik="${E(nik)}" type="button"`):"")}
    </form>`,{kind:"employee",record:r,oldNik:nik});
  toggleResignFields();
}
function toggleResignFields(){const resign=$("f-status").value==="resign";$("resignFields").hidden=!resign;$("beddingFields").hidden=resign;$("f-link_bukti").disabled=resign;updateCut();}
function updateCut(){if(!$("resignCut"))return;const n=[...$("dialogContent").querySelectorAll('input[name="return_asset"]')].filter(x=>!x.checked).reduce((n,x)=>n+Number(x.dataset.price||0),0);$("resignCut").textContent=rupiah(n);}
async function roomEdit(id=null){
  if(!admin()||(!id&&!superAdmin()))throw new Error("Akun Anda tidak memiliki akses.");
  const r=id?await result(sb.from("mess_rooms").select("*").eq("id",id).single()):{jumlah_bed:4,gender:"",lokasi_hunian:S.filters.kamar.location};
  openDialog(id?"Edit kamar":"Tambah kamar",`<form id="dialogForm" data-form="room"><p class="form-intro">Isi lokasi, blok, nomor kamar, dan jumlah tempat tidur. Jenis kelamin kamar harus sesuai dengan penghuninya.</p><div class="form-grid">
    ${field("lokasi_hunian","Lokasi hunian",r.lokasi_hunian,"text",'required maxlength="160" list="locationOptions"')}${field("floor","Lantai",r.floor)}
    ${field("block","Blok",r.block,"text",'required maxlength="30"')}${field("no_kamar","Nomor kamar",r.no_kamar,"text",'required maxlength="30"')}
    ${selectField("gender","Jenis kelamin",[["L","Laki-laki"],["P","Perempuan"]],r.gender)}${field("jumlah_bed","Jumlah tempat tidur",r.jumlah_bed,"number",'required min="1" max="100"')}
    ${field("golongan","Golongan",r.golongan,"number",'min="1" max="30"')}${selectField("fasilitas","Fasilitas",["CR","NR"],r.fasilitas)}
    <div class="wide">${check("rusak","Ada kerusakan",r.rusak)}</div><div class="wide">${field("catatan","Catatan kondisi kamar",r.catatan)}</div>
    </div><datalist id="locationOptions">${[...new Set(S.rooms.map(r=>r.lokasi_hunian))].map(l=>`<option value="${E(l)}">`).join("")}</datalist>
    ${formFoot("Simpan",id&&superAdmin()?actionButton("room-delete","Hapus kamar","danger",`data-room="${id}" type="button"`):"")}</form>`,{kind:"room",record:r,id});
}
async function moveEmployee(nik){
  if(!admin())throw new Error("Hanya Super Admin atau Administrator yang dapat menempatkan karyawan.");
  const r=await result(sb.from("mess_employees").select("*").eq("nik",nik).single());
  if(r.status!=="aktif")throw new Error("Karyawan yang keluar kerja tidak dapat ditempatkan.");
  if(!r.gender)throw new Error("Isi jenis kelamin karyawan terlebih dahulu melalui Edit.");
  const locations=[...new Set(S.rooms.filter(k=>k.gender===r.gender).map(k=>k.lokasi_hunian))].sort(compare);
  openDialog(r.kamar_id?"Pindahkan karyawan":"Tempatkan karyawan",`<form id="dialogForm" data-form="move"><p style="margin-bottom:18px"><strong>${E(r.nama)}</strong><br><span class="hint">${E(r.nik)} · ${E(roomLabel(S.roomMap[r.kamar_id]))}${r.no_bed?" · Tempat tidur "+r.no_bed:""}</span></p><div class="form-grid">
    ${selectField("move_location","Lokasi",locations,"","required")}${selectField("move_block","Blok",[],"","required")}
    <div class="wide">${selectField("move_room","Kamar",[],"","required")}</div>
    </div><div class="section-label">Pilih tempat tidur kosong</div><div id="moveBeds" class="bed-picker"></div><p class="hint" id="moveHint">Pilih lokasi, blok, dan kamar.</p>
    ${formFoot("Pindahkan")}</form>`,{kind:"move",record:r,bed:null});
  $("dialogSave").disabled=true;
}
function setOptions(id,options,placeholder="Pilih"){$(id).innerHTML=`<option value="">${E(placeholder)}</option>${options.map(o=>`<option value="${E(Array.isArray(o)?o[0]:o)}">${E(Array.isArray(o)?o[1]:o)}</option>`).join("")}`;}
function moveLocationsChanged(){const rooms=S.rooms.filter(r=>r.gender===S.modal.record.gender&&r.lokasi_hunian===$("f-move_location").value);setOptions("f-move_block",[...new Set(rooms.map(r=>r.block))].sort(compare));setOptions("f-move_room",[]);resetMoveBeds();}
function moveBlocksChanged(){const rooms=S.rooms.filter(r=>r.gender===S.modal.record.gender&&r.lokasi_hunian===$("f-move_location").value&&r.block===$("f-move_block").value).sort((a,b)=>compare(a.no_kamar,b.no_kamar));setOptions("f-move_room",rooms.map(r=>[r.id,"Kamar "+r.no_kamar+" · "+r.sisa+" tempat tidur kosong"+(r.rusak?" · Ada kerusakan":"")]));resetMoveBeds();}
function resetMoveBeds(){S.modal.bed=null;$("moveBeds").innerHTML="";$("dialogSave").disabled=true;$("moveHint").textContent="Pilih tempat tidur kosong.";}
async function moveRoomChanged(){
  resetMoveBeds();const ctx=S.modal,id=Number($("f-move_room").value);if(!id)return;const room=S.roomMap[id];
  $("moveHint").textContent="Memeriksa tempat tidur…";
  const occupied=await result(sb.from("mess_employees").select("nik,nama,no_bed").eq("kamar_id",id).eq("status","aktif"));
  if(S.modal!==ctx||Number($("f-move_room")?.value)!==id)return;
  const used=Object.fromEntries(occupied.map(r=>[r.no_bed,r.nama]));
  $("moveBeds").innerHTML=Array.from({length:room.jumlah_bed},(_,i)=>`<button type="button" class="bed-choice" data-action="choose-bed" data-bed="${i+1}" ${used[i+1]?"disabled":""} title="${E(used[i+1]||"Kosong")}">Tempat tidur ${i+1}</button>`).join("");
  $("moveHint").textContent=room.rusak?"Kamar ini memiliki catatan kerusakan: "+(room.catatan||"periksa kondisi terlebih dahulu."):"Tempat tidur yang terisi tidak dapat dipilih.";
}
function chooseBed(btn){S.modal.bed=Number(btn.dataset.bed);S.dirty=true;document.querySelectorAll(".bed-choice").forEach(e=>e.classList.toggle("selected",e===btn));$("dialogSave").disabled=false;}
function assignBed(roomId,bed){
  if(!admin())throw new Error("Akun Anda tidak memiliki akses.");const room=S.roomMap[roomId];if(!room?.gender)throw new Error("Isi jenis kelamin kamar melalui Edit terlebih dahulu.");
  openDialog("Isi tempat tidur kosong",`<p style="margin-bottom:15px"><strong>${E(roomLabel(room))} · Tempat tidur ${bed}</strong><br><span class="hint">Pilih karyawan ${room.gender==="L"?"laki-laki":"perempuan"} yang masih aktif.</span></p><input class="input" id="assignSearch" placeholder="Cari nama atau NIK…" aria-label="Cari karyawan"><div id="assignList" style="margin-top:15px"></div><div class="dialog-foot"><button class="btn" data-action="close-dialog">Batal</button></div>`,{kind:"assign",room,bed});renderAssignList("");
}
function renderAssignList(query){
  const ctx=S.modal;if(ctx?.kind!=="assign")return;const tokens=norm(query).split(" ").filter(Boolean);
  const rows=S.employees.filter(r=>r.status==="aktif"&&r.gender===ctx.room.gender).map(r=>({r,score:matchScore(r,tokens)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||Number(!!a.r.kamar_id)-Number(!!b.r.kamar_id)||compare(a.r.nama,b.r.nama)).slice(0,12).map(x=>x.r);
  $("assignList").innerHTML=rows.map(r=>`<button class="list-choice" data-action="assign-person" data-nik="${E(r.nik)}"><span><strong>${E(r.nama)}</strong><small>${E(r.nik)} · ${E(roomLabel(S.roomMap[r.kamar_id]))}</small></span>${icon("move")}</button>`).join("")||empty("Karyawan tidak ditemukan.");
}
function cleaningDialog(id){
  const r=S.roomMap[id],editable=superAdmin();
  openDialog("Alat kebersihan kamar",`<form id="dialogForm" data-form="cleaning"><p style="margin-bottom:16px"><strong>${E(roomLabel(r))}</strong></p>
    ${!editable?'<p class="notice" style="margin-bottom:15px">Hanya Administrator yang dapat mengubah pengambilan alat kebersihan.</p>':""}
    ${S.tools.map(t=>{const item=r.kebersihan?.items?.[t.id]||{};return `<div style="border-bottom:1px solid var(--line);padding:12px 0">${check("tool_"+t.id,t.nama,item.ambil,`data-input="tool" data-id="${t.id}" ${editable?"":"disabled"}`)}
      <div id="toolDetails-${t.id}" class="form-grid" style="margin-top:10px" ${item.ambil?"":"hidden"}>${field("tool_date_"+t.id,"Tanggal pengambilan",item.tgl,"date",editable?"":"disabled")}${field("tool_nik_"+t.id,"NIK pengambil",item.nik,"text",editable?"":"disabled")}<div class="wide">${field("tool_name_"+t.id,"Nama pengambil",item.nama,"text",editable?"":"disabled")}</div></div></div>`;}).join("")||'<p class="muted">Belum ada daftar alat. Atur melalui Pengaturan.</p>'}
    ${editable?formFoot("Simpan"):'<div class="dialog-foot"><button type="button" class="btn" data-action="close-dialog">Tutup</button></div>'}</form>`,{kind:"cleaning",room:r,id});
}
function masterDialog(kind,id=null){
  const list=kind==="aset"?S.assets:S.tools,r=id?list.find(a=>a.id===id):{};
  if(!admin()||(kind==="alat"&&!superAdmin()))throw new Error("Akun Anda tidak memiliki akses.");
  openDialog((id?"Edit ":"Tambah ")+(kind==="aset"?"aset":"alat kebersihan"),`<form id="dialogForm" data-form="master"><div class="form-stack">
    ${field("master_name","Nama barang atau alat",r.nama,"text",'required maxlength="100"')}
    ${kind==="aset"?field("master_price","Harga penggantian (Rp)",r.harga??0,"number",'required min="0" max="999999999999999" step="1"'):""}
    ${field("master_order","Urutan",r.urutan??list.length+1,"number",'min="0" step="1"')}
    </div>${formFoot("Simpan")}</form>`,{kind:"master",masterKind:kind,id});
}
async function deletionDetail(id){
  if(!admin())throw new Error("Akun Anda tidak memiliki akses.");const r=await result(sb.from("mess_deletions").select("*").eq("id",id).single());
  openDialog("Data yang dihapus",`<div class="detail-list">${detailRow("Jenis",r.jenis)}${detailRow("Nama",r.nama)}${detailRow("Identitas",r.ref)}${detailRow("Waktu",timeText(r.waktu))}${detailRow("Oleh",r.oleh_email)}${detailRow("Catatan",r.detail)}</div><div class="section-label">Salinan data saat dihapus</div><pre class="json">${E(JSON.stringify(r.data_lengkap,null,2))}</pre><div class="dialog-foot"><button class="btn" data-action="close-dialog">Tutup</button></div>`,{kind:"deletion"});
}
async function saveDialog(event){
  event.preventDefault();const form=event.target,ctx=S.modal;if(!ctx||form.id!=="dialogForm")return;const data=Object.fromEntries(new FormData(form).entries()),btn=$("dialogSave");
  hideError("dialogError");btn.disabled=true;const oldLabel=btn.textContent;btn.innerHTML='<span class="spin"></span> Menyimpan';
  try{
    if(ctx.kind==="employee"){
      const pl=Object.fromEntries(BEDDING.map(([k])=>[k,new FormData(form).has("bed_"+k)]));
      const payload={...data,perlengkapan:pl,aset_kembali:new FormData(form).getAll("return_asset").map(Number),expected_updated_at:ctx.record.updated_at||null};
      if(data.status==="resign")payload.link_bukti=ctx.record.link_bukti||null;
      await rpc("save_employee",{p_old_nik:ctx.oldNik,p_data:payload});
    }else if(ctx.kind==="room"){await rpc("save_room",{p_id:ctx.id,p_data:{...data,rusak:new FormData(form).has("rusak"),expected_updated_at:ctx.record.updated_at||null}});
    }else if(ctx.kind==="move"){if(!ctx.bed)throw new Error("Pilih tempat tidur kosong.");await rpc("move_employee",{p_nik:ctx.record.nik,p_kamar_id:Number(data.move_room),p_no_bed:ctx.bed});
    }else if(ctx.kind==="cleaning"){const f=new FormData(form),items=Object.fromEntries(S.tools.map(t=>[t.id,{ambil:f.has("tool_"+t.id),tgl:f.get("tool_date_"+t.id)||null,nik:f.get("tool_nik_"+t.id)||null,nama:f.get("tool_name_"+t.id)||null}]));
      await rpc("save_cleaning",{p_id:ctx.id,p_data:{items,expected_updated_at:ctx.room.updated_at||null}});
    }else if(ctx.kind==="master"){await rpc("master",{p_kind:ctx.masterKind,p_id:ctx.id,p_nama:data.master_name,p_harga:Number(data.master_price||0),p_urutan:Number(data.master_order||0),p_delete:false});
    }
    closeDialog(true);toast("Data tersimpan.");await refresh(true);
  }catch(error){if(S.modal===ctx)showError("dialogError",error);else showError("globalError",error);}
  finally{if(btn.isConnected){btn.disabled=false;btn.textContent=oldLabel;}}
}

function renderProfile(){
  const p=S.profile;
  const masterList=(list,kind)=>list.map(r=>`<div class="summary-line" style="align-items:center"><span><strong>${E(r.nama)}</strong>${kind==="aset"?`<br><small>${rupiah(r.harga)}</small>`:""}</span><span class="row-actions">${actionButton("master-edit","Edit","sm",`data-kind="${kind}" data-id="${r.id}"`)}${actionButton("master-delete","Hapus","sm danger",`data-kind="${kind}" data-id="${r.id}"`)}</span></div>`).join("")||'<p class="muted">Belum ada item.</p>';
  $("pageActions").innerHTML=DEMO?actionButton("demo-reset",icon("refresh")+"Reset data contoh"):actionButton("logout",icon("exit")+"Keluar","danger");
  $("pageContent").innerHTML=`<div class="profile-grid">
    <div class="card"><div class="card-body"><div class="profile-top"><span class="avatar" id="profileAvatar">${E(initials(p.nama||p.email))}</span><div><strong>${E(p.nama||p.email.split("@")[0])}</strong>${badge(roleName(p.role))}</div></div>
      <div class="detail-list">${detailRow("Email",p.email)}${detailRow("Bergabung",dateText(S.user.created_at))}${detailRow("Terakhir masuk",timeText(S.user.last_sign_in_at))}</div>
      <form id="profileForm" class="form-stack" style="margin-top:20px">${field("profile_name","Nama tampilan",p.nama,"text",'maxlength="200"')}<label class="field"><span>Foto profil (JPG, PNG, WebP · maks. ${DEMO?"1":"3"} MB)</span><input class="input" id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn" type="submit" id="profileSave">Simpan profil</button></form>
    </div></div>
    ${DEMO?`<div class="card"><div class="card-head"><h2>Mode uji coba</h2></div><div class="card-body">
      <p style="margin-bottom:14px">Anda masuk otomatis sebagai Administrator. Seluruh menu dapat dicoba menggunakan data contoh.</p>
      <p class="hint">Coba tambah karyawan, isi tempat tidur kosong, proses pengantaran, atau ubah status menjadi keluar kerja. Nama, NIK, dan harga di sini adalah contoh.</p>
      <div class="detail-list" style="margin-top:18px">${detailRow("Penyimpanan",sb.persistent?"Di browser ini":"Selama halaman dibuka")}${detailRow("Data awal","20 karyawan aktif · 10 kamar")}</div>
    </div></div>`:`<div class="card"><div class="card-head"><h2>Ubah kata sandi</h2></div><div class="card-body"><form id="passwordForm" class="form-stack">
      ${field("new_password","Kata sandi baru","", "password",'required minlength="6" autocomplete="new-password"')}${field("repeat_password","Ulangi kata sandi baru","","password",'required minlength="6" autocomplete="new-password"')}<p class="hint">Minimal 6 karakter, mengikuti kebijakan kata sandi perusahaan.</p><button class="btn primary" type="submit" id="passwordSave">Simpan kata sandi</button>
    </form></div></div>`}
    ${admin()?`<details class="card wide"><summary>Daftar akun &amp; hak akses</summary><div class="card-body">
      <div class="account-head"><p class="account-help">${canCreateAccounts()?"Buat akun untuk pengguna baru, lalu pilih hak aksesnya.":"Lihat akun terdaftar dan atur hak akses. Pembuatan akun hanya tersedia untuk Administrator."}</p>${canCreateAccounts()?actionButton("account-add",icon("plus")+"Buat akun","primary"):""}</div>
      <form id="roleForm" class="toolbar" style="align-items:flex-end">
      <label class="field" style="flex:1;min-width:200px"><span>Email akun yang sudah terdaftar</span><input class="input" name="role_email" type="email" required placeholder="nama@perusahaan.com"></label>
      <label class="field"><span>Hak akses</span><select class="input" name="role_value"><option value="pengguna">Pengguna</option><option value="admin">Super Admin</option>${superAdmin()?'<option value="super_admin">Administrator</option>':""}</select></label><button class="btn primary" type="submit">Simpan</button></form><div id="roleList" class="hint">Memuat akun…</div>
    </div></details>
    <details class="card"><summary>Daftar barang &amp; harga pengganti</summary><div class="card-body"><p class="hint" style="margin-bottom:12px">Isi harga penggantian sesuai ketentuan perusahaan. Harga saat keluar kerja disimpan dalam riwayat.</p>${masterList(S.assets,"aset")}<div style="margin-top:14px">${actionButton("master-add",icon("plus")+"Tambah barang","","data-kind=\"aset\"")}</div></div></details>
    ${superAdmin()?`<details class="card"><summary>Daftar alat kebersihan</summary><div class="card-body">${masterList(S.tools,"alat")}<div style="margin-top:14px">${actionButton("master-add",icon("plus")+"Tambah alat","","data-kind=\"alat\"")}</div></div></details>`:""}
    <div class="card"><div class="card-head"><h2>Pemeriksaan data</h2></div><div class="card-body"><p class="hint" style="margin-bottom:15px">Periksa kapasitas, jenis kelamin, fasilitas, dan penempatan karyawan.</p>${actionButton("data-check","Periksa sekarang")}<div id="dataCheckResult" style="margin-top:15px"></div></div></div>
    <div class="card"><div class="card-head"><h2>Cadangan data</h2></div><div class="card-body"><p class="hint" style="margin-bottom:15px">Unduh seluruh tabel aplikasi sebagai JSON dan Excel. Foto profil disimpan terpisah.</p><button class="btn primary" data-action="backup" id="backupButton">${icon("download")}Unduh cadangan</button></div></div>
    `:""}
  </div>`;
  renderIdentity();if(admin())loadRoles().catch(error=>{if($("roleList"))$("roleList").textContent=errorText(error);});
}
async function loadRoles(){
  const rows=await readAll("profiles",{order:"email"});if(S.page!=="profil"||!$("roleList"))return;
  $("roleList").innerHTML=table(["Nama / email","Hak akses",""],rows.map(r=>`<tr><td>${E(r.nama||r.email)}${r.nama?`<br><small>${E(r.email)}</small>`:""}</td><td>${badge(roleName(r.role))}</td><td>${r.user_id===S.user.id?badge("Akun Anda"):r.role==="super_admin"&&!superAdmin()?"":`<div class="row-actions">${superAdmin()&&r.role!=="super_admin"?actionButton("role-super","Jadikan Administrator","sm",`data-email="${E(r.email)}"`):""}${r.role!=="pengguna"?actionButton("role-revoke","Jadikan Pengguna","sm danger",`data-email="${E(r.email)}"`):actionButton("role-admin","Jadikan Super Admin","sm",`data-email="${E(r.email)}"`)}</div>`}</td></tr>`).join(""));
}
function accountDialog(){
  if(!canCreateAccounts())throw new Error("Hanya Administrator yang dapat membuat akun.");
  openDialog("Buat akun",`<form id="accountForm" class="form-stack">
    <p class="form-intro">Isi akun orang yang akan menggunakan web. Pilih Pengguna untuk akses melihat data.</p>
    ${DEMO?'<p class="notice">Mode uji coba: akun ini hanya contoh di browser dan tidak dapat digunakan untuk login. Kata sandi tidak disimpan.</p>':""}
    ${field("account_name","Nama lengkap","","text",'required maxlength="200" autocomplete="off"')}
    ${field("account_username","Email atau NIK","","text",'required maxlength="254" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="accountUserHint"')}
    <p class="hint" id="accountUserHint">Contoh: petugas@perusahaan.com atau NIK 123456. NIK akan menjadi 123456@${E(NIK_DOMAIN)}.</p>
    <label class="field"><span>Kata sandi awal</span><span class="account-password"><input class="input" id="f-account_password" name="account_password" type="password" required minlength="8" maxlength="72" autocomplete="new-password" aria-describedby="accountPasswordHint"><button type="button" class="text-btn" data-action="account-password" aria-controls="f-account_password" aria-pressed="false" aria-label="Tampilkan kata sandi awal">Lihat</button></span></label>
    ${field("account_repeat","Ulangi kata sandi awal","","password",'required minlength="8" maxlength="72" autocomplete="new-password"')}
    <p class="hint" id="accountPasswordHint">Minimal 8 karakter. Pengguna dapat mengganti kata sandinya setelah login.</p>
    ${selectField("account_role","Hak akses",[["pengguna","Pengguna"],["admin","Super Admin"],["super_admin","Administrator"]],"pengguna","required")}
    <p class="hint">Pengguna melihat data. Super Admin mengelola data harian. Administrator memiliki seluruh akses dan dapat membuat akun.</p>
    <div class="dialog-foot"><button type="button" class="btn" data-action="close-dialog" id="accountCancel">Batal</button><button type="submit" class="btn primary" id="accountSave">Buat akun</button></div>
  </form>`,{kind:"account",busy:false});
}
function accountPayload(form){
  const data=new FormData(form),name=String(data.get("account_name")||"").trim(),username=String(data.get("account_username")||"").trim().toLowerCase();
  if(!name||name.length>200)throw new Error("Isi nama lengkap, maksimal 200 karakter.");
  if(!username||(!username.includes("@")&&!/^[a-z0-9._-]+$/i.test(username)))throw new Error("Isi email lengkap atau NIK tanpa spasi.");
  const email=username.includes("@")?username:username+"@"+NIK_DOMAIN.toLowerCase();
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Alamat email belum benar. Periksa kembali.");
  const password=String(data.get("account_password")||""),role=String(data.get("account_role")||"");
  if(password.length<8||new TextEncoder().encode(password).length>72)throw new Error("Kata sandi minimal 8 karakter dan maksimal 72 byte. Gunakan kata sandi lebih pendek jika memakai simbol khusus.");
  if(password!==data.get("account_repeat"))throw new Error("Kedua kata sandi tidak sama.");
  if(!["pengguna","admin","super_admin"].includes(role))throw new Error("Pilih hak akses yang tersedia.");
  return {name,email,password,role};
}
async function accountError(error){
  if(error?.context?.status===401)return "Sesi tidak valid. Keluar lalu login kembali sebelum membuat akun.";
  if(error?.context?.status===404)return "Fungsi mess-create-user belum ditemukan. Pasang fungsi tersebut di Supabase sesuai panduan.";
  if(error?.context?.json){try{const body=await error.context.json();if(typeof body?.message==="string")return body.message;}catch{/* Respons gateway bukan JSON. */}}
  if(/FunctionsFetchError|FunctionsRelayError/.test(error?.name||"")||/Failed to fetch|Edge Function|NetworkError/i.test(error?.message||""))return "Pembuatan akun belum dapat diakses. Periksa koneksi dan pastikan fungsi mess-create-user sudah dipasang sesuai panduan.";
  return errorText(error);
}
async function saveAccount(event){
  event.preventDefault();const ctx=S.modal;if(ctx?.kind!=="account"||ctx.busy)return;
  const btn=$("accountSave"),cancel=$("accountCancel");hideError("dialogError");
  try{
    if(!canCreateAccounts())throw new Error("Hanya Administrator yang dapat membuat akun.");
    const payload=accountPayload(event.target);ctx.busy=true;S.dirty=true;btn.disabled=true;cancel.disabled=true;btn.setAttribute("aria-busy","true");btn.textContent="Membuat akun…";
    const {data,error}=await sb.functions.invoke("mess-create-user",{body:payload});
    if(error)throw new Error(await accountError(error));
    if(data?.ok!==true)throw new Error(data?.message||"Akun belum berhasil dibuat.");
    if(S.modal===ctx){$("f-account_password").value="";$("f-account_repeat").value="";closeDialog(true);}
    toast(DEMO?"Akun contoh dibuat. Akun ini tidak digunakan untuk login.":"Akun berhasil dibuat. Pengguna dapat login dengan akun baru.");
    if(S.page==="profil")try{await loadRoles();}catch{showError("globalError",new Error("Akun sudah dibuat, tetapi daftar akun belum diperbarui. Tekan Perbarui untuk melihatnya."));}
  }catch(error){if(S.modal===ctx)showError("dialogError",error);else showError("globalError",error);}
  finally{ctx.busy=false;if(btn.isConnected){btn.disabled=false;cancel.disabled=false;btn.setAttribute("aria-busy","false");btn.textContent="Buat akun";}}
}
async function saveProfile(event){
  event.preventDefault();const btn=$("profileSave"),form=event.target,f=$("avatarFile").files[0],name=new FormData(form).get("profile_name");let path=S.profile.avatar_path,uploaded=null,oldPath=path;
  btn.disabled=true;
  try{
    if(f){
      const formats={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
      if(!formats[f.type])throw new Error("Gunakan file JPG, PNG, atau WebP.");
      if(f.size>(DEMO?1:3)*1024*1024)throw new Error("Foto terlalu besar. Maksimal "+(DEMO?"1":"3")+" MB.");
      uploaded=S.user.id+"/avatar-"+Date.now()+"."+formats[f.type];await result(sb.storage.from("mess-avatars").upload(uploaded,f,{contentType:f.type,upsert:false}));path=uploaded;
    }
    S.profile=await rpc("edit_profile",{p_nama:String(name||"").trim(),p_avatar_path:path||null});S.profileDirty=false;
    if(uploaded&&oldPath&&oldPath!==uploaded)try{await result(sb.storage.from("mess-avatars").remove([oldPath]));}catch{}
    toast("Profil diperbarui.");await navigate("profil");
  }catch(error){if(uploaded)try{await sb.storage.from("mess-avatars").remove([uploaded]);}catch{}showError("globalError",error);}
  finally{if(btn.isConnected)btn.disabled=false;}
}
async function savePassword(event){
  if(DEMO){event.preventDefault();return;}
  event.preventDefault();const form=event.target,data=new FormData(form),btn=$("passwordSave");btn.disabled=true;
  try{if(data.get("new_password")!==data.get("repeat_password"))throw new Error("Kedua kata sandi tidak sama.");const {error}=await sb.auth.updateUser({password:String(data.get("new_password"))});if(error)throw error;form.reset();toast("Kata sandi diperbarui.");}
  catch(error){showError("globalError",error);}finally{btn.disabled=false;}
}
async function setRole(email,role){await rpc("set_role",{p_email:email,p_role:role});toast("Hak akses diperbarui.");await loadRoles();}
function checkData(){
  const issues=[],active=S.employees.filter(r=>r.status==="aktif");
  S.rooms.forEach(r=>{if(r.terisi>r.jumlah_bed)issues.push(roomLabel(r)+": jumlah penghuni melebihi kapasitas.");
    if(r.fasilitas==="NR"&&r.golongan&&r.golongan!==1)issues.push(roomLabel(r)+": fasilitas NR dan golongan "+r.golongan+" perlu diperiksa.");
  });
  const bedMap={};
  active.forEach(r=>{const room=S.roomMap[r.kamar_id];
    if(room&&r.gender!==room.gender)issues.push(r.nama+": jenis kelamin tidak sesuai dengan kamar.");
    if(room&&(r.no_bed<1||r.no_bed>room.jumlah_bed))issues.push(r.nama+": nomor tempat tidur di luar kapasitas.");
    if(room){const k=room.id+":"+r.no_bed;if(bedMap[k])issues.push(roomLabel(room)+": tempat tidur "+r.no_bed+" terisi lebih dari satu orang.");bedMap[k]=true;}
  });
  const without=active.filter(r=>!r.kamar_id).length,gender=active.filter(r=>!r.gender).length;
  if(without)issues.push(without+" karyawan aktif belum ditempatkan.");if(gender)issues.push(gender+" karyawan aktif belum memiliki jenis kelamin.");
  $("dataCheckResult").innerHTML=issues.length?`<p style="color:var(--warn);font-weight:600">${issues.length} catatan</p><ul style="margin:8px 0 0;padding-left:18px">${issues.map(t=>`<li>${E(t)}</li>`).join("")}</ul>`:badge("Tidak ditemukan masalah pada data yang dimuat.","ok");
}
const loadedScripts=new Map();
async function loadLibrary(name,urls){
  if(window[name])return window[name];
  for(const url of urls){
    try{
      if(!loadedScripts.has(url))loadedScripts.set(url,new Promise((resolve,reject)=>{
        const script=document.createElement("script");let timer=setTimeout(()=>{script.remove();reject(new Error("Waktu memuat pustaka habis."));},15000);
        script.src=url;script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error("Pustaka gagal dimuat."));};document.head.appendChild(script);
      }));
      await loadedScripts.get(url);if(window[name])return window[name];
    }catch{loadedScripts.delete(url);}
  }throw new Error("Koneksi belum tersedia. Periksa internet dan muat ulang halaman.");
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function backup(){
  if(!admin())throw new Error("Hanya Super Admin atau Administrator yang dapat mengunduh cadangan data.");const btn=$("backupButton"),names=["employees","rooms","moves","deletions","assets","tools","profiles"];btn.disabled=true;btn.innerHTML='<span class="spin"></span> Menyiapkan';let jsonSaved=false;
  try{
    const tables={};for(const name of names)tables["mess_"+name]=await readAll(name,{order:name==="employees"?"nik":name==="profiles"?"user_id":"id"});
    download(new Blob([JSON.stringify({app:"mess-modern",mode:DEMO?"uji-coba":"supabase",schema_version:1,exported_at:new Date().toISOString(),timezone:ZONE,tables},null,2)],{type:"application/json"}),"Mess_Backup_"+today()+".json");jsonSaved=true;
    const lib=await loadLibrary("XLSX",["https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"]);
    const book=lib.utils.book_new();for(const [name,rows] of Object.entries(tables)){const flat=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v&&typeof v==="object"?JSON.stringify(v):v])));
      lib.utils.book_append_sheet(book,lib.utils.json_to_sheet(flat.length?flat:[{info:"Tabel kosong"}]),name.slice(0,31));}
    const bytes=lib.write(book,{bookType:"xlsx",type:"array"});await new Promise(r=>setTimeout(r,600));
    download(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"Mess_Backup_"+today()+".xlsx");toast("Cadangan JSON dan Excel selesai.");
  }catch(error){toast(jsonSaved?"Cadangan JSON sudah diunduh. Excel gagal: "+errorText(error):errorText(error));}
  finally{if(btn.isConnected){btn.disabled=false;btn.innerHTML=icon("download")+"Unduh cadangan";}}
}
function loginHelp(){
  openDialog("Bantuan masuk",`<p>Gunakan akun yang diberikan admin pengelola mess.</p>
    <ol class="guide-list">
      <li><span class="step-number">1</span><div><strong>Masukkan akun Anda</strong><p>Gunakan email lengkap. NIK hanya dapat dipakai jika admin membuat akun dengan alamat NIK@${E(NIK_DOMAIN)}.</p></div></li>
      <li><span class="step-number">2</span><div><strong>Periksa kata sandi</strong><p>Huruf besar dan kecil harus sesuai. Tekan Lihat untuk melihat kata sandi yang Anda ketik.</p></div></li>
      <li><span class="step-number">3</span><div><strong>Belum punya akun atau lupa kata sandi?</strong><p>Hubungi admin. Administrator membuat akun melalui web dan membantu pemulihan melalui Supabase.</p></div></li>
    </ol><p class="notice">Pemilik web: ikuti <a href="PANDUAN.html">panduan pemasangan database dan GitHub</a>.</p>
    <div class="dialog-foot"><button type="button" class="btn primary" data-action="close-dialog">Mengerti</button></div>`,{kind:"help"});
}
function quickHelp(){
  openDialog("Cara menggunakan",`<p>Mulai dari data kamar, lalu data karyawan dan penempatannya.</p>
    <ol class="guide-list">
      <li><span class="step-number">1</span><div><strong>Siapkan kamar</strong><p>Administrator membuka menu Kamar untuk mengisi lokasi, nomor kamar, jenis kelamin, dan kapasitas tempat tidur.</p></div></li>
      <li><span class="step-number">2</span><div><strong>Catat karyawan</strong><p>Buka Karyawan, pilih Tambah karyawan, isi nama dan NIK, lalu simpan. Akun Pengguna dapat melihat dan mencari data.</p></div></li>
      <li><span class="step-number">3</span><div><strong>Tempatkan dan antar</strong><p>Admin memilih Atur kamar pada data karyawan, lalu memilih kamar dan tempat tidur kosong. Tandai Sudah diantar di menu Pengantaran setelah selesai.</p></div></li>
    </ol><p class="notice">Untuk karyawan yang keluar, pilih Edit pada data karyawan, ubah status menjadi Keluar kerja, lalu catat barang yang dikembalikan.</p>
    <div class="dialog-foot"><button type="button" class="btn primary" data-action="close-dialog">Mengerti</button></div>`,{kind:"help"});
}
async function handleAction(btn){
  const a=btn.dataset.action;
  if(a==="theme")return theme();
  if(a==="login-help")return loginHelp();
  if(a==="help")return quickHelp();
  if(a==="account-add")return accountDialog();
  if(a==="account-password"){
    const input=$("f-account_password");if(S.modal?.kind!=="account"||!input)return;
    const show=input.type==="password";input.type=show?"text":"password";btn.textContent=show?"Sembunyikan":"Lihat";btn.setAttribute("aria-pressed",String(show));btn.setAttribute("aria-label",show?"Sembunyikan kata sandi awal":"Tampilkan kata sandi awal");input.focus();return;
  }
  if(a==="demo-reset"&&DEMO)return resetDemo();
  if(a==="logout"&&!DEMO)return logout();
  if(a==="nav"){if((S.dirty||S.profileDirty)&&!confirm("Ada perubahan yang belum disimpan. Tetap pindah menu?"))return;S.dirty=false;S.profileDirty=false;
    if(btn.dataset.focus==="unplaced"){S.filters.karyawan={q:"",company:"",gender:"",housing:"tanpa",sort:"nama"};S.pages.karyawan=1;}
    if(btn.dataset.focus==="damaged"){S.filters.kamar={location:"",block:"",status:"rusak"};S.pages.kamar=1;}
    return navigate(btn.dataset.page);}
  if(a==="refresh"){if((S.dirty||S.profileDirty)&&!confirm("Ada perubahan yang belum disimpan. Tetap perbarui?"))return;S.dirty=false;S.profileDirty=false;btn.disabled=true;try{return await refresh();}finally{btn.disabled=false;}}
  if(a==="page"){S.pages[btn.dataset.list]=Number(btn.dataset.number);return ({karyawan:renderEmployeeTable,kamar:renderRoomList,riwayat:renderHistoryTable,pindahan:renderPendingTable,resign:renderResignTable}[btn.dataset.list])();}
  if(a==="close-dialog")return closeDialog();
  if(a==="detail")return employeeDetail(btn.dataset.nik);
  if(a==="employee-add")return employeeEdit();
  if(a==="employee-edit")return employeeEdit(btn.dataset.nik);
  if(a==="employee-move")return moveEmployee(btn.dataset.nik);
  if(a==="room-add")return roomEdit();
  if(a==="room-edit")return roomEdit(Number(btn.dataset.room));
  if(a==="choose-bed")return chooseBed(btn);
  if(a==="assign")return assignBed(Number(btn.dataset.room),Number(btn.dataset.bed));
  if(a==="assign-person"){
    const ctx=S.modal,emp=S.employees.find(r=>r.nik===btn.dataset.nik);if(!confirm("Tempatkan "+emp.nama+" ke "+roomLabel(ctx.room)+" · Tempat tidur "+ctx.bed+"?"))return;
    btn.disabled=true;try{await rpc("move_employee",{p_nik:emp.nik,p_kamar_id:ctx.room.id,p_no_bed:ctx.bed});closeDialog(true);toast("Karyawan ditempatkan.");return await refresh(true);}finally{if(btn.isConnected)btn.disabled=false;}
  }
  if(a==="cleaning")return cleaningDialog(Number(btn.dataset.room));
  if(a==="employee-delete"||a==="room-delete"){
    const isEmployee=a==="employee-delete";if(!confirm(isEmployee?"Hapus karyawan dan riwayat perpindahannya? Salinan akan disimpan pada Riwayat penghapusan.":"Hapus kamar kosong ini? Salinan akan disimpan pada Riwayat penghapusan."))return;
    btn.disabled=true;try{await rpc(isEmployee?"delete_employee":"delete_room",isEmployee?{p_nik:btn.dataset.nik}:{p_id:Number(btn.dataset.room)});closeDialog(true);toast("Data dihapus.");return await refresh(true);}finally{if(btn.isConnected)btn.disabled=false;}
  }
  if(a==="delivered"){btn.disabled=true;try{await rpc("mark_delivered",{p_id:Number(btn.dataset.id)});toast("Pengantaran ditandai selesai.");return await refresh(true);}finally{if(btn.isConnected)btn.disabled=false;}}
  if(a==="history-mode"){S.filters.riwayat.mode=btn.dataset.mode;S.pages.riwayat=1;return navigate("riwayat",false);}
  if(a==="deletion-detail")return deletionDetail(Number(btn.dataset.id));
  if(a==="master-add")return masterDialog(btn.dataset.kind);
  if(a==="master-edit")return masterDialog(btn.dataset.kind,Number(btn.dataset.id));
  if(a==="master-delete"){
    if(S.profileDirty&&!confirm("Perubahan profil belum disimpan. Lanjut dan buang perubahan profil?"))return;S.profileDirty=false;
    if(!confirm("Hapus barang atau alat ini?"))return;btn.disabled=true;try{await rpc("master",{p_kind:btn.dataset.kind,p_id:Number(btn.dataset.id),p_nama:"",p_harga:0,p_urutan:0,p_delete:true});toast("Item dihapus.");return await refresh(true);}finally{if(btn.isConnected)btn.disabled=false;}
  }
  if(a.startsWith("role-")){const role=a==="role-super"?"super_admin":a==="role-admin"?"admin":"pengguna";
    if(!confirm("Ubah akses "+btn.dataset.email+" menjadi "+roleName(role)+"?"))return;btn.disabled=true;try{return await setRole(btn.dataset.email,role);}finally{if(btn.isConnected)btn.disabled=false;}}
  if(a==="data-check")return checkData();
  if(a==="backup")return backup();
}
document.addEventListener("click",async event=>{
  const btn=event.target.closest?.("[data-action]");if(!btn||btn.disabled)return;
  if(btn.closest("form")&&btn.type!=="submit")event.preventDefault();
  try{await handleAction(btn);}catch(error){if(btn.closest("#dialog")&&$("dialog").open)showError("dialogError",error);else {showError("globalError",error);toast(errorText(error));}}
});
let searchTimer;
document.addEventListener("input",event=>{
  const target=event.target;
  if(target.dataset.filter){const group=target.dataset.filter,key=target.dataset.key;S.filters[group][key]=target.value;S.pages[group]=1;
    const render=()=>({karyawan:renderEmployeeTable,kamar:renderRoomList,riwayat:renderHistoryTable,laporan:renderReportBody,pindahan:renderPendingTable,resign:renderResignTable}[group])();
    if(group==="kamar"&&key==="location"){S.filters.kamar.block="";renderRooms();return;}
    if(key==="q"){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(S.page===group)render();},180);}else render();return;
  }
  if(target.id==="assignSearch"){renderAssignList(target.value);return;}
  if(target.closest("#dialogForm")||target.closest("#accountForm"))S.dirty=true;
  if(target.id==="f-status")toggleResignFields();
  if(target.dataset.input==="all-bedding")$("dialogContent").querySelectorAll('[data-input="bedding"]').forEach(c=>c.checked=target.checked);
  if(target.dataset.input==="bedding")$("dialogContent").querySelector('[data-input="all-bedding"]').checked=[...$("dialogContent").querySelectorAll('[data-input="bedding"]')].every(c=>c.checked);
  if(target.name==="return_asset")updateCut();
  if(target.dataset.input==="tool"){const id=target.dataset.id;$("toolDetails-"+id).hidden=!target.checked;if(target.checked&&!$("f-tool_date_"+id).value)$("f-tool_date_"+id).value=today();}
  if(target.id==="f-move_location")moveLocationsChanged();
  if(target.id==="f-move_block")moveBlocksChanged();
  if(target.id==="f-move_room")moveRoomChanged().catch(e=>showError("dialogError",e));
  if(target.closest("#profileForm"))S.profileDirty=true;
});
document.addEventListener("submit",async event=>{
  if(event.target.id==="dialogForm")return saveDialog(event);
  if(event.target.id==="accountForm")return saveAccount(event);
  if(event.target.id==="profileForm")return saveProfile(event);
  if(event.target.id==="passwordForm")return savePassword(event);
  if(event.target.id==="roleForm"){
    event.preventDefault();const form=event.target,fd=new FormData(form),button=form.querySelector('button[type="submit"]');button.disabled=true;
    try{await setRole(String(fd.get("role_email")),String(fd.get("role_value")));form.reset();}catch(error){showError("globalError",error);}finally{button.disabled=false;}
  }
});
$("loginForm").addEventListener("submit",login);
$("showPassword").addEventListener("click",togglePassword);
$("dialog").addEventListener("cancel",event=>{if(S.modal?.busy||(S.dirty&&!confirm("Ada perubahan yang belum disimpan. Tetap tutup?")))event.preventDefault();else closeDialog(true);});
window.addEventListener("beforeunload",event=>{if(S.dirty||S.profileDirty){event.preventDefault();event.returnValue="";}});
function updateHeader(){
  $("headerDate").textContent=new Intl.DateTimeFormat("id-ID",{timeZone:ZONE,day:"numeric",month:"short",year:"numeric"}).format(new Date())+" · WIT";
}
async function resetDemo(){
  if(!confirm("Kembalikan seluruh data contoh ke kondisi awal? Perubahan uji coba yang disimpan akan dihapus."))return;
  sb.reset();S.coreSeq++;S.navSeq++;S.dirty=false;S.profileDirty=false;closeDialog(true);S.pages={};
  S.filters={karyawan:{q:"",company:"",gender:"",housing:"",sort:"nama"},kamar:{location:"",block:"",status:""},riwayat:{q:"",mode:"pindah"},pindahan:{q:""},resign:{q:""},laporan:{company:""}};
  remember("page","beranda");await enterApp(sb.user());toast("Data contoh dikembalikan ke kondisi awal.");
}
let sb=null;
async function init(){
  updateHeader();
  try{
    if(!["demo","supabase"].includes(CONFIG.mode))throw new Error("Pengaturan web belum sesuai. Hubungi admin untuk menyelesaikan pemasangan.");
    document.title="Mess Karyawan · "+(DEMO?"Uji Coba":"PT KPS");
    if(DEMO){
      sb=createDemoClient();$("demoBanner").hidden=false;
      $("demoNote").textContent=sb.persistent?"Data contoh · perubahan tersimpan di browser ini.":"Data contoh · perubahan berlaku selama halaman dibuka.";
      await enterApp(sb.user());return;
    }
    $("loginScreen").hidden=false;
    if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error("Web belum terhubung ke database. Pemilik web dapat mengikuti Panduan pemasangan di bawah.");
    let validURL=false;try{validURL=new URL(SUPABASE_URL).protocol==="https:";}catch{}
    if(!validURL)throw new Error("Alamat database belum benar. Hubungi admin untuk memeriksa pengaturan web.");
    let secret=SUPABASE_KEY.startsWith("sb_secret_");
    try{secret=secret||JSON.parse(atob(SUPABASE_KEY.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).role==="service_role";}catch{}
    if(secret)throw new Error("Jenis kunci database belum sesuai. Pemilik web harus memakai Publishable key sesuai panduan pemasangan.");
    $("loginStatus").textContent="Menyiapkan koneksi login…";
    const sdk=await loadLibrary("supabase",["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js","https://unpkg.com/@supabase/supabase-js@2.57.4/dist/umd/supabase.js"]);
    sb=sdk.createClient(SUPABASE_URL,SUPABASE_KEY);
    setLoginBusy(false);$("loginStatus").textContent="";
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"&&S.user){S.coreSeq++;S.navSeq++;S.user=null;S.profile=null;S.employees=[];S.rooms=[];S.dirty=false;S.profileDirty=false;closeDialog(true);$("app").hidden=true;$("loginScreen").hidden=false;}
      if(session&&event==="TOKEN_REFRESHED")S.user=session.user;
    });
    const {data,error}=await sb.auth.getSession();if(error)throw error;
    if(data.session)await enterApp(data.session.user);
  }catch(error){
    if(DEMO){$("app").hidden=false;showError("globalError",error);}
    else {$("loginScreen").hidden=false;showError("loginError",error);$("logoutOnError").hidden=!S.user;
      $("loginStatus").textContent=sb?"":"Login belum siap. Lihat panduan pemasangan atau hubungi admin.";setLoginBusy(false);}
  }finally{$("bootScreen").hidden=true;}
}
const demoReady=init();
