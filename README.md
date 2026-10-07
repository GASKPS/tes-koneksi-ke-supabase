# Mess Karyawan · Siap Upload V7

Hasil build React dengan keterangan kerusakan sederhana. Centang Kerusakan berat menolak penempatan dan pengantaran baru. Format kartu dan bed tetap dipertahankan. Foto login, ikon, pencarian, profil, pengantaran massal dan pengaman versi V6 tetap tersedia.

1. Ekstrak ZIP. Unggah seluruh isi folder ke root repository sehingga index.html, coba.html, assets/, PANDUAN.html langsung terlihat. Gunakan seluruh paket; file assets lama dapat diganti.
2. Settings → Pages → Deploy from a branch → main → /(root) → Save.
3. Jika database sudah V6: jalankan SELURUH supabase/update_v7.sql. Jika masih V5, jalankan update_v6.sql dahulu, kemudian update_v7.sql. Pilih Run without RLS jika diminta.
4. Akun, kamar, penghuni, catatan dan riwayat lama tetap digunakan. Tidak perlu impor ulang. Kedua fungsi akun sama dengan V6; tidak perlu deploy ulang jika sudah terpasang.
5. Buka alamat GitHub Pages dan muat ulang. coba.html untuk uji coba tanpa login. Folder assets/ wajib ikut diunggah. Cara memasang fungsi akun jika belum tersedia dijelaskan di PANDUAN.pdf/HTML.

Database baru: supabase_setup.sql → update_v5.sql → update_v6.sql → update_v7.sql, lalu akun pertama dan fungsi. Mengunggah supabase/ tidak menjalankan SQL. Jangan menjalankan ulang setup/V5/V6 setelah V7. update_v7.sql boleh diulang.

Kode sumber terpisah tersedia di Mess_Karyawan_React_V7.zip. index.html hanya pintu masuk hasil build. Buka melalui HTTP/HTTPS, bukan klik ganda file HTML.
