# Mess Karyawan · Siap Upload V5

Paket ini adalah hasil build React, Vite, dan Tailwind. Konfigurasi proyek Supabase jricrpiubdoailjoelft sudah terpasang.

1. Ekstrak ZIP. Unggah seluruh isi folder ini ke root repository GitHub, sehingga index.html, coba.html, dan assets terlihat langsung.
2. Pilih Settings → Pages → Deploy from a branch → main → /(root) → Save.
3. Buka alamat web yang ditampilkan GitHub. Tambahkan /coba.html untuk mode uji coba tanpa login.
4. Jika database V3/V4 sudah terpasang, jalankan hanya supabase/update_v5.sql pada SQL Editor proyek yang sama. Data dan akun lama tetap dipakai; fungsi mess-create-user tetap sama.
5. Untuk pemasangan pertama, ikuti PANDUAN.pdf: jalankan supabase_setup.sql lalu update_v5.sql, buat Administrator, dan pasang fungsi akun.

React dibuka melalui URL HTTP/HTTPS; membuka HTML melalui file:// tidak menjalankan modulnya. Folder assets harus ikut diunggah.

Untuk mengubah komponen, gunakan paket Mess_Karyawan_React_V5.zip, edit src/, dan build ulang. ZIP sumber memiliki pilihan publikasi otomatis melalui GitHub Actions.

Fitur V5: impor Excel dengan pratinjau, laporan PDF/Excel sesuai filter, tracking perbaikan kamar, filter tanggal Riwayat WIT, dan popup terpusat. Bentuk kartu kamar dipertahankan.

Data contoh hanya disimpan pada browser. Versi utama meminta login Supabase. Mengunggah folder supabase ke GitHub tidak menjalankan SQL atau memasang Edge Function.
