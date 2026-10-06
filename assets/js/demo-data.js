/* Mode uji coba: seluruh data contoh disimpan di browser ini. */
const DEMO_DATA_KEY = "mess-simple-demo-v1";
const DEMO_USER_ID = "demo-super-admin";
const DEMO_TABLES = ["employees", "rooms", "moves", "deletions", "assets", "tools", "profiles"];
const copyDemo = value => JSON.parse(JSON.stringify(value));
function seedDemoData() {
  const stamp = new Date().toISOString();
  const past = days => new Date(Date.now() - days * 86400000).toISOString();
  const day = days => past(days).slice(0, 10);
  const assets = [
    ["Selimut", 150000], ["Bantal kepala", 75000], ["Bantal guling", 75000],
    ["Sarung bantal", 35000], ["Seprai", 125000]
  ].map(([nama, harga], i) => ({id:i+1, nama, harga, urutan:i+1, created_at:stamp}));
  const tools = ["Sapu lantai", "Alat pel", "Ember", "Pengki"].map((nama, i) => ({id:i+1, nama, urutan:i+1, created_at:stamp}));
  const addresses = [
    ["Mess Utama", "60", "01", "L", 4, 1, "NR"],
    ["Mess Utama", "60", "02", "L", 4, 1, "NR"],
    ["Mess Utama", "61", "01", "L", 2, 2, "CR"],
    ["Mess Utama", "61", "02", "L", 2, 2, "CR"],
    ["Mess Timur", "A", "01", "L", 4, 1, "NR"],
    ["Mess Timur", "A", "02", "L", 4, 1, "NR"],
    ["Mess Putri", "P1", "01", "P", 4, 1, "NR"],
    ["Mess Putri", "P1", "02", "P", 2, 2, "CR"],
    ["Mess Putri", "P2", "01", "P", 4, 1, "NR"],
    ["Mess Putri", "P2", "02", "P", 2, 2, "CR"]
  ];
  const rooms = addresses.map(([lokasi_hunian, block, no_kamar, gender, jumlah_bed, golongan, fasilitas], i) => ({
    id:i+1, lokasi_hunian, block, no_kamar, gender, jumlah_bed, golongan, fasilitas,
    floor:"1", rusak:i===3, catatan:i===3?"AC perlu diperiksa.":null,
    kebersihan:{items:i===0?{"1":{ambil:true, tgl:day(5), nik:"UC1001", nama:"Andi Pratama"},"2":{ambil:true, tgl:day(5), nik:"UC1001", nama:"Andi Pratama"}}:{}},
    created_at:past(60), updated_at:stamp
  }));
  const names = ["Andi Pratama", "Budi Santoso", "Dimas Saputra", "Fajar Maulana", "Rizky Ramadhan", "Agus Setiawan", "Hendra Wijaya", "Arif Hidayat", "Yusuf Nugroho", "Bayu Kurniawan", "Rudi Hartono", "Ilham Akbar", "Siti Aminah", "Dewi Lestari", "Nadia Putri", "Rina Wulandari", "Ayu Permata", "Fitri Handayani", "Maya Sari", "Intan Safitri"];
  const departments = ["Camp & Facility", "Canteen", "Maintenance", "Housekeeping"];
  const employees = names.map((nama, i) => ({
    nik:"UC"+(1001+i), nama, gender:i<12?"L":"P", department:departments[i%4],
    jabatan:i%6===0?"Supervisor":"Staf", gol:i%6===0?"2":"1", fasilitas:i%6===0?"CR":"NR",
    perusahaan:i%4===0?"PT HJF":"PT KPS", point_of_hire:i%3===0?"Ternate":"Jakarta",
    tgl_masuk_kerja:day(180+i), tgl_masuk_mess:i===9?null:day(7), status:"aktif", kamar_id:null, no_bed:null,
    perlengkapan:Object.fromEntries(BEDDING.map(([key])=>[key,i!==9&&i!==14])),
    link_bukti:null, tgl_resign:null, alasan_resign:null, resign_oleh:null,
    aset_kembali:[], aset_snapshot:[], potongan:0, created_at:past(30), updated_at:stamp
  }));
  const placements = [[0,1,1],[1,1,2],[2,1,3],[3,1,4],[4,2,1],[5,2,2],[6,3,1],[7,5,1],[8,5,2],[9,6,1],[12,7,1],[13,7,2],[14,7,3],[15,8,1],[16,8,2],[17,9,1]];
  const moves = placements.map(([i, roomId, bed], index) => {
    const r=rooms.find(x=>x.id===roomId), waiting=[9,14,17].includes(i);
    employees[i].kamar_id=roomId;employees[i].no_bed=bed;
    return {id:index+1, nik:employees[i].nik, tipe:"penempatan", dari_kamar_id:null, ke_kamar_id:roomId,
      dari_label:null, ke_label:roomLabel(r), dari_no_bed:null, ke_no_bed:bed,
      oleh_email:"admin@contoh.local", waktu:past(waiting?1:7), diantar:!waiting,
      diantar_oleh:waiting?null:"admin@contoh.local", diantar_pada:waiting?null:past(6), dibatalkan:false};
  });
  ["Doni Saputra", "Lia Anggraini"].forEach((nama, i) => {
    const r={...copyDemo(employees[i]), nik:"UC"+(2001+i), nama, gender:i===0?"L":"P", status:"resign", kamar_id:null, no_bed:null,
      tgl_resign:day(3+i), alasan_resign:i===0?"Kontrak selesai":"Keperluan keluarga", resign_oleh:"admin@contoh.local",
      aset_snapshot:copyDemo(assets), aset_kembali:i===0?[1,2,3,4]:assets.map(a=>a.id), potongan:i===0?125000:0};
    employees.push(r);
    const oldRoom=rooms.find(x=>x.id===(i===0?2:9));
    moves.push({id:moves.length+1, nik:r.nik, tipe:"keluar", dari_kamar_id:oldRoom.id, ke_kamar_id:null,
      dari_label:roomLabel(oldRoom), ke_label:null, dari_no_bed:3, ke_no_bed:null,
      oleh_email:"admin@contoh.local", waktu:past(3+i), diantar:true, diantar_oleh:null, diantar_pada:null, dibatalkan:false});
  });
  const deleted = {...copyDemo(rooms[3]), id:99, no_kamar:"99", rusak:false, catatan:null};
  const profiles = [
    {user_id:DEMO_USER_ID, email:"admin@contoh.local", nama:"Administrator Uji Coba", role:"super_admin", avatar_path:null, created_at:past(30)},
    {user_id:"demo-admin", email:"petugas@contoh.local", nama:"Petugas GA", role:"admin", avatar_path:null, created_at:past(20)},
    {user_id:"demo-viewer", email:"pengguna@contoh.local", nama:"Pengguna Contoh", role:"pengguna", avatar_path:null, created_at:past(10)}
  ];
  return {version:1, employees, rooms, moves, assets, tools, profiles, avatars:{},
    deletions:[{id:1, jenis:"Kamar", ref:"99", nama:roomLabel(deleted), detail:"Kamar kosong dihapus (contoh).", data_lengkap:deleted, oleh_email:"admin@contoh.local", waktu:past(4)}],
    next:{rooms:11, moves:moves.length+1, deletions:2, assets:6, tools:5}};
}
function createDemoClient() {
  let db, persistent=true;
  try {
    const stored=localStorage.getItem(DEMO_DATA_KEY);
    if(stored) {
      const parsed=JSON.parse(stored);
      if(parsed.version===1&&DEMO_TABLES.every(name=>Array.isArray(parsed[name]))&&parsed.next&&parsed.avatars&&parsed.profiles.some(p=>p.user_id===DEMO_USER_ID))db=parsed;
    }
  } catch { /* Data lokal tidak terbaca: gunakan contoh awal. */ }
  if(!db)db=seedDemoData();
  try {localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(db));} catch {persistent=false;}
  const actor = state => state.profiles.find(p=>p.user_id===DEMO_USER_ID);
  const level = state => ({pengguna:0, admin:1, super_admin:2}[actor(state).role]??0);
  const requireLevel=(state,minimum)=>{if(level(state)<minimum)throw new Error("Akun Anda tidak memiliki akses.");};
  const find=(state,name,key,value)=>{const row=state[name].find(r=>r[key]===value);if(!row)throw new Error("Data tidak ditemukan. Perbarui halaman lalu coba lagi.");return row;};
  const stale=(row,data)=>{if(data.expected_updated_at&&row.updated_at!==data.expected_updated_at)throw new Error("Data sudah berubah. Tutup formulir, perbarui data, lalu edit kembali.");};
  const text=value=>String(value??"").trim()||null;
  const required=(value,label,max)=>{const v=text(value);if(!v||v.length>max)throw new Error(label+" wajib diisi, maksimal "+max+" karakter.");return v;};
  const integer=(value,min,max,label)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(label+" harus "+min+"–"+max+".");return n;};
  const gender=value=>{const g=text(value);if(g&&!['L','P'].includes(g))throw new Error("Gender tidak valid.");return g;};
  const facility=value=>{const f=text(value);if(f&&!['CR','NR'].includes(f))throw new Error("Fasilitas tidak valid.");return f;};
  function commit(next) {
    if(persistent)try {localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(next));}
    catch {throw new Error("Penyimpanan browser penuh. Gunakan foto lebih kecil atau reset data contoh.");}
    db=next;
  }
  function mutate(fn) {const next=copyDemo(db),value=fn(next);commit(next);return value===undefined?null:copyDemo(value);}
  function appendMove(state, employee, destination, bed, tipe) {
    const oldRoom=state.rooms.find(r=>r.id===employee.kamar_id), now=new Date().toISOString();
    state.moves.filter(m=>m.nik===employee.nik&&!m.diantar).forEach(m=>m.dibatalkan=true);
    state.moves.push({id:state.next.moves++, nik:employee.nik, tipe, dari_kamar_id:oldRoom?.id||null,
      ke_kamar_id:destination?.id||null, dari_label:oldRoom?roomLabel(oldRoom):null,
      ke_label:destination?roomLabel(destination):null, dari_no_bed:employee.no_bed, ke_no_bed:bed,
      oleh_email:actor(state).email, waktu:now, diantar:tipe==="keluar", diantar_oleh:null, diantar_pada:null, dibatalkan:false});
  }
  function tableRows(name) {
    if(name==="room_status")return db.rooms.map(r=>{
      const terisi=db.employees.filter(e=>e.status==="aktif"&&e.kamar_id===r.id).length;
      return {...r, terisi, sisa:Math.max(0,r.jumlah_bed-terisi), status_kamar:!terisi?"KOSONG":terisi>=r.jumlah_bed?"FULL":"TERISI"};
    });
    if(!DEMO_TABLES.includes(name))throw new Error("Tabel uji coba tidak tersedia.");
    return db[name];
  }
  class Query {
    constructor(name){this.name=name;this.filters=[];this.ordering=[];this.start=0;this.end=Infinity;this.columns="*";this.one=false;}
    select(columns="*"){this.columns=columns;return this;}
    order(column,options={}){this.ordering.push({column,ascending:options.ascending!==false});return this;}
    range(start,end){this.start=start;this.end=end;return this;}
    limit(count){this.end=this.start+count-1;return this;}
    eq(key,value){this.filters.push(row=>row[key]===value);return this;}
    single(){this.one=true;return this;}
    then(resolve,reject){
      let response;
      try {
        let rows=tableRows(this.name).filter(r=>this.filters.every(f=>f(r)));
        rows.sort((a,b)=>{for(const o of this.ordering){const n=compare(a[o.column],b[o.column]);if(n)return n*(o.ascending?1:-1);}return 0;});
        rows=rows.slice(this.start,this.end+1);
        if(this.one&&rows.length!==1)throw new Error("Data tidak ditemukan.");
        if(this.columns!=="*"){const names=this.columns.split(",").map(s=>s.trim());rows=rows.map(row=>Object.fromEntries(names.map(n=>[n,row[n]])));}
        response={data:copyDemo(this.one?rows[0]:rows),error:null};
      } catch(error) {response={data:null,error:{message:error.message}};}
      return Promise.resolve(response).then(resolve,reject);
    }
  }
  function handleRPC(name,args) {
    if(name==="profile")return copyDemo(actor(db));
    return mutate(state=>{
      const now=new Date().toISOString(),p=args.p_data||{};
      if(name==="edit_profile") {
        const own=actor(state);own.nama=String(args.p_nama||"").trim().slice(0,200);
        if(args.p_avatar_path&&!state.avatars[args.p_avatar_path])throw new Error("Foto tidak ditemukan.");
        own.avatar_path=args.p_avatar_path||null;return own;
      }
      if(name==="set_role") {
        requireLevel(state,1);const role=args.p_role;
        if(!['pengguna','admin','super_admin'].includes(role))throw new Error("Hak akses tidak valid.");
        const target=state.profiles.find(p=>p.email.toLowerCase()===String(args.p_email).trim().toLowerCase());
        if(!target)throw new Error("Pilih email akun contoh yang ada dalam daftar.");
        if(target.user_id===DEMO_USER_ID)throw new Error("Hak akses akun Anda sendiri tidak dapat diubah.");
        if((role==="super_admin"||target.role==="super_admin")&&level(state)<2)throw new Error("Hanya Administrator yang dapat mengubah akses ini.");
        target.role=role;return;
      }
      if(name==="save_employee") {
        requireLevel(state,1);const old=args.p_old_nik?find(state,"employees","nik",args.p_old_nik):null;
        if(old)stale(old,p);
        const nik=required(p.nik,"NIK",80),nama=required(p.nama,"Nama",200),g=gender(p.gender),status=p.status||"aktif";
        if(!['aktif','resign'].includes(status))throw new Error("Status tidak valid.");
        if(state.employees.some(r=>r.nik===nik&&r!==old))throw new Error("NIK ini sudah terdaftar.");
        const room=state.rooms.find(r=>r.id===old?.kamar_id);
        if(status==="aktif"&&room&&room.gender!==g)throw new Error("Gender karyawan harus sesuai dengan kamar.");
        if(p.link_bukti&&!safeURL(p.link_bukti))throw new Error("Link bukti harus dimulai dengan https:// atau http://.");
        const row={...(old||{}),nik,nama,gender:g,status,fasilitas:facility(p.fasilitas),
          created_at:old?.created_at||now,updated_at:now,kamar_id:old?.kamar_id||null,no_bed:old?.no_bed||null,
          perlengkapan:Object.fromEntries(BEDDING.map(([key])=>[key,p.perlengkapan?.[key]===true])),
          aset_snapshot:[],aset_kembali:[],potongan:0,tgl_resign:null,alasan_resign:null,resign_oleh:null};
        for(const key of ["department","jabatan","gol","perusahaan","point_of_hire","tgl_masuk_kerja","tgl_masuk_mess","link_bukti"])row[key]=text(p[key]);
        if(status==="resign") {
          row.aset_snapshot=copyDemo(old?.status==="resign"?old.aset_snapshot:state.assets);
          if(!Array.isArray(p.aset_kembali||[]))throw new Error("Daftar aset pengembalian tidak valid.");
          row.aset_kembali=[...new Set(p.aset_kembali||[])];
          if(row.aset_kembali.some(id=>!row.aset_snapshot.some(a=>a.id===id)))throw new Error("Daftar aset pengembalian tidak sesuai.");
          row.potongan=row.aset_snapshot.filter(a=>!row.aset_kembali.includes(a.id)).reduce((sum,a)=>sum+a.harga,0);
          row.tgl_resign=text(p.tgl_resign)||today();row.alasan_resign=text(p.alasan_resign);row.resign_oleh=old?.resign_oleh||actor(state).email;
          if(old?.status==="aktif"&&old.kamar_id)appendMove(state,old,null,null,"keluar");
          else state.moves.filter(m=>m.nik===old?.nik&&!m.diantar).forEach(m=>m.dibatalkan=true);
          row.kamar_id=null;row.no_bed=null;
        }
        if(old){state.moves.filter(m=>m.nik===old.nik).forEach(m=>m.nik=nik);Object.assign(old,row);return old;}
        state.employees.push(row);return row;
      }
      if(name==="save_room") {
        requireLevel(state,args.p_id?1:2);const old=args.p_id?find(state,"rooms","id",args.p_id):null;
        if(old)stale(old,p);
        const row={...(old||{}),id:old?.id||state.next.rooms++,lokasi_hunian:required(p.lokasi_hunian,"Lokasi",160),
          block:required(p.block,"Blok",30),no_kamar:required(p.no_kamar,"Nomor kamar",30),floor:text(p.floor),gender:gender(p.gender),
          jumlah_bed:integer(p.jumlah_bed,1,100,"Jumlah bed"),golongan:text(p.golongan)?integer(p.golongan,1,30,"Golongan"):null,
          fasilitas:facility(p.fasilitas),rusak:p.rusak===true,catatan:text(p.catatan),
          kebersihan:old?.kebersihan||{items:{}},created_at:old?.created_at||now,updated_at:now};
        if(state.rooms.some(r=>r!==old&&norm(r.lokasi_hunian)===norm(row.lokasi_hunian)&&code(r.block)===code(row.block)&&code(r.no_kamar)===code(row.no_kamar)))throw new Error("Kamar dengan lokasi, blok, dan nomor ini sudah terdaftar.");
        const residents=state.employees.filter(e=>e.status==="aktif"&&e.kamar_id===row.id);
        if(residents.some(e=>e.no_bed>row.jumlah_bed))throw new Error("Jumlah bed lebih kecil dari nomor bed penghuni.");
        if(residents.some(e=>e.gender!==row.gender))throw new Error("Gender kamar harus sesuai dengan penghuni.");
        if(old){Object.assign(old,row);return old;}state.rooms.push(row);return row;
      }
      if(name==="move_employee") {
        requireLevel(state,1);const employee=find(state,"employees","nik",args.p_nik),room=find(state,"rooms","id",args.p_kamar_id);
        if(employee.status!=="aktif")throw new Error("Karyawan resign tidak dapat ditempatkan.");
        if(!employee.gender||!room.gender||employee.gender!==room.gender)throw new Error("Gender karyawan dan kamar harus diisi dan sama.");
        const bed=integer(args.p_no_bed,1,room.jumlah_bed,"Nomor bed");
        if(state.employees.some(e=>e.status==="aktif"&&e.kamar_id===room.id&&e.no_bed===bed))throw new Error("Bed sudah terisi. Pilih bed yang lain.");
        appendMove(state,employee,room,bed,employee.kamar_id?"pindah":"penempatan");
        employee.kamar_id=room.id;employee.no_bed=bed;employee.updated_at=now;return;
      }
      if(name==="mark_delivered") {
        requireLevel(state,1);const m=find(state,"moves","id",args.p_id);
        if(m.dibatalkan||m.diantar)throw new Error("Pindahan ini sudah selesai atau dibatalkan.");
        m.diantar=true;m.diantar_oleh=actor(state).email;m.diantar_pada=now;return;
      }
      if(name==="save_cleaning") {
        requireLevel(state,2);const room=find(state,"rooms","id",args.p_id);stale(room,p);
        room.kebersihan={items:copyDemo(p.items||{})};room.updated_at=now;return;
      }
      if(name==="master") {
        if(!['aset','alat'].includes(args.p_kind))throw new Error("Jenis master tidak valid.");
        requireLevel(state,args.p_kind==="alat"?2:1);const table=args.p_kind==="aset"?"assets":"tools";
        const old=args.p_id?find(state,table,"id",args.p_id):null;
        if(args.p_delete){if(!old)throw new Error("Item tidak ditemukan.");state[table]=state[table].filter(r=>r!==old);return;}
        const row={...(old||{}),id:old?.id||state.next[table]++,nama:required(args.p_nama,"Nama item",100),urutan:integer(args.p_urutan||0,0,2147483647,"Urutan"),created_at:old?.created_at||now};
        if(table==="assets")row.harga=integer(args.p_harga||0,0,999999999999999,"Harga");
        if(old){Object.assign(old,row);return old;}state[table].push(row);return row;
      }
      if(name==="delete_employee") {
        requireLevel(state,1);const employee=find(state,"employees","nik",args.p_nik),history=state.moves.filter(m=>m.nik===employee.nik);
        state.deletions.push({id:state.next.deletions++,jenis:"Karyawan",ref:employee.nik,nama:employee.nama,detail:roomLabel(state.rooms.find(r=>r.id===employee.kamar_id)),data_lengkap:{karyawan:copyDemo(employee),perpindahan:copyDemo(history)},oleh_email:actor(state).email,waktu:now});
        state.employees=state.employees.filter(e=>e!==employee);state.moves=state.moves.filter(m=>m.nik!==employee.nik);return;
      }
      if(name==="delete_room") {
        requireLevel(state,2);const room=find(state,"rooms","id",args.p_id);
        if(state.employees.some(e=>e.kamar_id===room.id))throw new Error("Kamar masih memiliki penghuni.");
        state.deletions.push({id:state.next.deletions++,jenis:"Kamar",ref:String(room.id),nama:roomLabel(room),detail:"Kamar kosong dihapus.",data_lengkap:copyDemo(room),oleh_email:actor(state).email,waktu:now});
        state.moves.forEach(m=>{if(m.dari_kamar_id===room.id)m.dari_kamar_id=null;if(m.ke_kamar_id===room.id)m.ke_kamar_id=null;});
        state.rooms=state.rooms.filter(r=>r!==room);return;
      }
      throw new Error("Tindakan uji coba tidak tersedia.");
    });
  }
  return {
    persistent,
    from:name=>new Query(name.replace(/^mess_/,"")),
    rpc:async(name,args={})=>{try{return {data:handleRPC(name.replace(/^mess_/,""),args),error:null};}catch(error){return {data:null,error:{message:error.message}};}},
    functions:{invoke:async(name,{body}={})=>{try{
      if(name!=="mess-create-user")throw new Error("Fungsi uji coba tidak tersedia.");
      const user=mutate(state=>{
        requireLevel(state,2);
        if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("Data akun tidak valid.");
        const nama=required(body.name,"Nama lengkap",200),email=required(body.email,"Email",254).toLowerCase(),password=body.password,role=body.role;
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Alamat email belum benar.");
        if(typeof password!=="string"||password.length<8||new TextEncoder().encode(password).length>72)throw new Error("Kata sandi minimal 8 karakter dan maksimal 72 byte.");
        if(!["pengguna","admin","super_admin"].includes(role))throw new Error("Hak akses tidak valid.");
        if(state.profiles.some(p=>p.email.toLowerCase()===email))throw new Error("Email ini sudah terdaftar. Gunakan email atau NIK lain.");
        const user_id="demo-account-"+Date.now()+"-"+state.profiles.length;
        // Akun contoh hanya profil; kata sandi tidak masuk penyimpanan lokal.
        state.profiles.push({user_id,email,nama,role,avatar_path:null,created_at:new Date().toISOString()});
        return {id:user_id,email,name:nama,role};
      });
      return {data:{ok:true,user},error:null};
    }catch(error){return {data:null,error:{message:error.message}};}}},
    user:()=>({id:DEMO_USER_ID,email:actor(db).email,created_at:actor(db).created_at,last_sign_in_at:new Date().toISOString()}),
    reset:()=>{commit(seedDemoData());},
    storage:{from:()=>({
      createSignedUrl:async path=>db.avatars[path]?{data:{signedUrl:db.avatars[path]},error:null}:{data:null,error:{message:"Foto tidak ditemukan."}},
      upload:async(path,file)=>{try {
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Foto gagal dibaca."));reader.readAsDataURL(file);});
        mutate(state=>{state.avatars[path]=data;});return {data:{path},error:null};
      }catch(error){return {data:null,error:{message:error.message}};}},
      remove:async paths=>{try{mutate(state=>paths.forEach(path=>delete state.avatars[path]));return {data:[],error:null};}catch(error){return {data:null,error:{message:error.message}};}}
    })}
  };
}
