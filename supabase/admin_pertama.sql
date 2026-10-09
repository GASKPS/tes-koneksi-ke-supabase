-- Akun pertama mendapat peran Administrator (nilai database: super_admin).
-- 1. Buat/cek akun melalui Supabase > Authentication > Users.
-- 2. Ganti GANTI_EMAIL_ADMIN_ANDA di bawah.
-- 3. Jalankan seluruh file di SQL Editor SETELAH supabase_setup.sql.
do $$
declare v_email text := 'GANTI_EMAIL_ADMIN_ANDA'; v_id uuid;
begin
 if position('@' in v_email)=0 then
   raise exception 'Isi v_email dengan email akun yang sudah dibuat di Authentication.';
 end if;
 select id into v_id from auth.users where lower(email)=lower(btrim(v_email));
 if v_id is null then raise exception 'Akun email % belum ditemukan di Authentication.',v_email; end if;
 insert into public.mess_profiles(user_id,email,nama,role)
 select id,email,coalesce(raw_user_meta_data->>'nama',''),'super_admin'
 from auth.users where id=v_id
 on conflict(user_id) do update set role='super_admin',email=excluded.email;
end
$$;
