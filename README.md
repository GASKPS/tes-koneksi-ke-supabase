# Mess Karyawan · Siap Upload V6

Hasil build React dengan foto login, ikon utuh, pencarian kamar, popup pengantaran tengah, pengantaran massal, profil bertab dan pengaman versi penempatan.

1. Ekstrak ZIP. Unggah seluruh isi folder ke root repository, sehingga index.html, coba.html, assets/, PANDUAN.html terlihat langsung.
2. Settings → Pages → Deploy from a branch → main → /(root) → Save.
3. Database V5 sudah terpasang: jalankan SELURUH supabase/update_v6.sql, pilih Run without RLS jika diminta. Akun dan data lama tetap dipakai.
4. Perbarui mess-create-user dan pasang mess-manage-user dari folder supabase/functions/. Verifikasi JWT tetap aktif. Langkah lengkap pada PANDUAN.pdf/HTML.
5. Buka alamat web GitHub; coba.html untuk uji coba tanpa login. Folder assets dan foto login wajib ikut diunggah.

Database baru: supabase_setup.sql → update_v5.sql → update_v6.sql, lalu akun pertama dan fungsi. Mengunggah supabase/ tidak menjalankan SQL atau memasang fungsi.

Kode sumber terpisah tersedia di Mess_Karyawan_React_V6.zip. Paket ini tidak menjalankan JSX mentah; index.html hanya pintu masuk hasil build. Buka melalui HTTP/HTTPS, bukan klik ganda file HTML.
