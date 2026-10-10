# Mess Karyawan · Siap Upload V8.1

Menu akun di kanan atas kini berisi Profil Saya, Pengaturan, dan Keluar, dengan nama dan email akun. Profil Saya langsung membuka informasi akun dan formulir nama/foto. Pengaturan membuka Ganti Kata Sandi; pengaturan lain tetap tersedia sesuai hak akses.

Foto baru ditampilkan sebagai pratinjau sebelum disimpan. Batalkan perubahan mengembalikan nama serta pilihan foto tanpa menulis data. Simpan profil aktif setelah ada perubahan dan nama terisi. Perpindahan tab/menu dan tombol kembali browser menjaga formulir yang belum disimpan.

## Jika database sudah V8

1. Gunakan proyek Supabase yang sama. Tidak ada SQL tambahan untuk V8.1.
2. Ekstrak ZIP. Unggah seluruh isi folder hasil ekstraksi ke root repository GitHub yang sama: index.html, coba.html, assets/, PANDUAN.html, dan file pendukung. Ganti web lama dengan V8.1.
3. Settings → Pages → Deploy from a branch → main → /(root). Muat ulang web setelah proses GitHub Pages selesai.

Jika SQL V8 belum dipasang pada database V7, salin SELURUH supabase/update_v8.sql sampai commit; ke query baru SQL Editor Supabase, lalu jalankan. Panduan lengkap terdapat di PANDUAN.html. Jangan jalankan ulang setup dasar pada database yang sudah terisi. Folder supabase yang diunggah ke GitHub tidak menjalankan SQL otomatis.

Uji coba tanpa login: buka coba.html melalui HTTP/HTTPS. Data contoh tersimpan di browser dan tidak menghubungi Supabase. Kode komponen React terpisah tersedia di Mess_Karyawan_React_V8_1.zip.

161 pengujian otomatis dan build produksi berhasil. Pemeriksaan visual komputer/HP belum dapat dilakukan karena browser pengujian tidak berjalan pada lingkungan pembuat. Pengujian navigasi, konfirmasi formulir, pembatalan foto, penyimpanan profil, dan hak akses memakai sesi contoh; layanan foto juga diuji dengan respons Supabase contoh. Web belum diunggah ke GitHub atau diuji pada akun Supabase pemilik.
