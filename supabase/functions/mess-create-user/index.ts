/* Jalankan hanya di Supabase Edge Functions. Jangan dimuat oleh HTML. */
import { createSupabaseContext } from "npm:@supabase/server@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BODY_BYTES = 8192;
const roles = new Set(["pengguna", "admin", "super_admin"]);

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { message: "Gunakan permintaan POST." });

  try {
    const { data: ctx, error: contextError } = await createSupabaseContext(req, { auth: "user" });
    if (contextError || !ctx) return reply(401, { message: "Sesi tidak valid. Keluar lalu login kembali." });

    // Verifikasi akun masih aktif; identitas berasal dari sesi, bukan isi formulir.
    const { data: identity, error: identityError } = await ctx.supabase.auth.getUser();
    if (identityError || !identity.user || identity.user.is_anonymous) {
      return reply(401, { message: "Login dengan akun Administrator terlebih dahulu." });
    }
    const { data: profile, error: profileError } = await ctx.supabaseAdmin
      .from("mess_profiles")
      .select("role,aktif")
      .eq("user_id", identity.user.id)
      .maybeSingle();
    if (profileError) return reply(503, { message: "Data hak akses belum dapat dibaca. Periksa pemasangan database." });
    // super_admin adalah nilai database untuk Administrator, hak akses tertinggi.
    if (profile?.role !== "super_admin" || profile?.aktif === false) {
      return reply(403, { message: "Hanya Administrator yang dapat membuat akun." });
    }

    if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) {
      return reply(413, { message: "Data formulir terlalu besar." });
    }
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return reply(413, { message: "Data formulir terlalu besar." });
    }
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      body = parsed;
    } catch {
      return reply(400, { message: "Data formulir tidak valid." });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const role = body.role;
    if (!name || name.length > 200) return reply(400, { message: "Isi nama lengkap, maksimal 200 karakter." });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(400, { message: "Alamat email belum benar. Periksa kembali." });
    }
    if (typeof password !== "string" || password.length < 8 || new TextEncoder().encode(password).length > 72) {
      return reply(400, { message: "Kata sandi minimal 8 karakter dan maksimal 72 byte." });
    }
    if (typeof role !== "string" || !roles.has(role)) return reply(400, { message: "Hak akses tidak valid." });

    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama: name },
    });
    if (createError || !created.user) {
      const code = createError?.code || "";
      if (["email_exists", "user_already_exists"].includes(code) || /already.*(?:registered|exists)/i.test(createError?.message || "")) {
        return reply(409, { message: "Email ini sudah terdaftar. Gunakan email atau NIK lain." });
      }
      if (["weak_password", "validation_failed"].includes(code)) {
        return reply(400, { message: "Email atau kata sandi belum memenuhi ketentuan Supabase. Periksa email dan gunakan kata sandi yang lebih kuat." });
      }
      return reply(502, { message: "Supabase belum berhasil membuat akun. Coba lagi setelah memeriksa koneksi." });
    }

    const id = created.user.id;
    let saved = false;
    try {
      const { error } = await ctx.supabaseAdmin.from("mess_profiles").upsert({
        user_id: id, email, nama: name, role,
      }, { onConflict: "user_id" });
      saved = !error;
    } catch { /* Kegagalan jaringan juga harus membatalkan akun baru. */ }
    if (!saved) {
      let removed = false;
      try {
        const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(id);
        removed = !error;
      } catch { /* Respons berikut memberi tahu pengelola untuk memeriksa akun. */ }
      if (!removed) return reply(502, {
        accountCreated: true,
        message: "Akun login sudah dibuat, tetapi hak aksesnya belum tersimpan. Periksa akun tersebut di Supabase Authentication > Users dan mess_profiles sebelum mencoba lagi.",
      });
      return reply(503, { message: "Akun belum dibuat karena hak akses gagal disimpan. Periksa database, lalu coba lagi." });
    }
    return reply(201, { ok: true, user: { id, email, name, role } });
  } catch {
    return reply(500, { message: "Pembuatan akun belum dapat diproses. Periksa status fungsi mess-create-user di Supabase." });
  }
}

Deno.serve(handleRequest);
