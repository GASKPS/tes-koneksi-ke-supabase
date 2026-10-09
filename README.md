# Mess Karyawan · Siap Upload V7.2

Login transparan lebih ringkas. Kartu kamar dan tombol bawah sejajar per baris, nomor kamar dipilih dari dropdown, dan baris penghuni hijau muda jika sudah masuk tetapi fasilitas belum lengkap. Yang belum masuk tetap merah muda. Profil dirapikan dengan pratinjau foto dan menu Pengaturan/Keluar di kanan atas. Pop-up Cara menggunakan dihapus.

## Memperbarui web dengan database V7

1. Ekstrak ZIP. Unggah seluruh isi folder ke root repository GitHub yang sama, sehingga index.html, coba.html, assets/, dan PANDUAN.html langsung terlihat. Sertakan semua file assets/ dari paket terbaru.
2. Untuk paket siap upload, gunakan Settings → Pages → Deploy from a branch → main → /(root). Jika pengaturan ini sudah benar, tidak perlu diubah.
3. Buka web dan muat ulang. Tidak ada SQL baru untuk V7.2. Akun dan database V7 yang sudah terpasang langsung digunakan.

Mode uji coba tanpa login tersedia di coba.html. Buka melalui HTTP/HTTPS, bukan klik ganda file HTML. Keluar dari mode coba kembali ke halaman login utama; data contoh masih dapat dicoba lagi melalui coba.html.

## Jika database belum V7

Ikuti PANDUAN.html. Jika database sudah V6, jalankan seluruh supabase/update_v7.sql. Jika masih V5, jalankan update_v6.sql dahulu, lalu update_v7.sql. Untuk pemasangan baru: supabase_setup.sql → update_v5.sql → update_v6.sql → update_v7.sql, lalu akun pertama dan fungsi akun. Panduan PDF tetap membahas database V7. Mengunggah folder supabase/ ke GitHub tidak menjalankan SQL atau fungsi.

Kode sumber dengan komponen React terpisah tersedia di Mess_Karyawan_React_V7_2.zip. index.html hanya pintu masuk hasil build. Jumlah bed, izin akses, pengaman pemindahan, dan larangan penempatan ke kamar rusak berat tetap menggunakan data dan aturan V7.
