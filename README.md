# Mess Karyawan · Siap Upload V8.2

Klik foto/inisial akun di kanan atas untuk Profil Saya, Ganti Kata Sandi, Hak Akses, Download, Pengaturan Mess, dan Keluar sesuai izin akun. Profil Saya memakai satu kartu, tanpa menu tab mendatar. Tata letak formulir dan tombol pengaturan dirapikan, tampilan ponsel satu kolom, serta transisi singkat mengikuti reduced motion. Kartu kamar dan tempat tidur tetap sama.

Foto baru ditampilkan sebagai pratinjau sebelum disimpan. Batalkan perubahan mengembalikan nama serta pilihan foto tanpa menulis data. Simpan profil aktif setelah ada perubahan dan nama terisi. Navigasi, Perbarui, serta tombol kembali browser menjaga formulir yang belum disimpan.

## Pembaruan data manual

Koneksi Supabase Realtime dan pemeriksaan setiap 45 detik sudah dihapus, termasuk pemuatan data saat fokus, online, visibility, dan perubahan tab lain. Tekan Perbarui untuk mengambil perubahan admin lain. Data tetap dimuat saat masuk dan setelah penyimpanan sendiri; pembaruan token login Supabase Auth tetap berjalan. Riwayat, filter penghuni, lock database, serta penolakan formulir pemindahan lama tetap aktif.

## Jika database sudah V8

1. Gunakan proyek Supabase yang sama. Tidak ada SQL tambahan untuk V8.2.
2. Ekstrak ZIP. Unggah seluruh isi folder hasil ekstraksi ke root repository GitHub yang sama: index.html, coba.html, assets/, PANDUAN.html, dan file pendukung. Ganti web lama dengan V8.2.
3. Settings → Pages → Deploy from a branch → main → /(root). Setelah GitHub Pages selesai, muat ulang SEMUA tab dan perangkat agar kode lama yang memeriksa data berkala tidak tetap berjalan.

Jika SQL V8 belum dipasang pada database V7, salin SELURUH supabase/update_v8.sql sampai commit; ke query baru SQL Editor Supabase, lalu jalankan. Panduan lengkap terdapat di PANDUAN.html. Jangan jalankan ulang setup dasar pada database yang sudah terisi. Mengunggah folder supabase ke GitHub tidak menjalankan SQL otomatis.

Uji coba tanpa login: buka coba.html melalui HTTP/HTTPS. Data contoh tersimpan di browser dan tidak menghubungi Supabase. Kode komponen React terpisah tersedia di Mess_Karyawan_React_V8_2.zip.

160 pengujian otomatis dan build produksi berhasil. Tes mencakup dropdown, formulir belum disimpan, hak akses, profil/foto, pembaruan manual, tidak adanya permintaan data berkala, serta pengaman database. Pemeriksaan visual komputer/HP belum dapat dilakukan karena browser pengujian tidak berjalan pada lingkungan pembuat. Web belum diunggah ke GitHub atau diuji pada akun Supabase pemilik.
