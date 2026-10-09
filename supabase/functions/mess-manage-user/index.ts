/* Hanya di Supabase Edge Functions. Kata sandi tidak disimpan di tabel Mess. */
import { createSupabaseContext } from "npm:@supabase/server@1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {status, headers: {...corsHeaders, "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"}});
}
async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
  if (req.method !== "POST") return reply(405,{message:"Gunakan permintaan POST."});
  try {
    const {data:ctx,error:contextError} = await createSupabaseContext(req,{auth:"user"});
    if (contextError || !ctx) return reply(401,{message:"Sesi tidak valid. Keluar lalu login kembali."});
    const {data:identity,error:identityError} = await ctx.supabase.auth.getUser();
    if (identityError || !identity.user || identity.user.is_anonymous) return reply(401,{message:"Masuk dengan akun Administrator terlebih dahulu."});
    const {data:profile,error:profileError} = await ctx.supabaseAdmin.from("mess_profiles").select("role,aktif").eq("user_id",identity.user.id).maybeSingle();
    if (profileError) return reply(503,{message:"Data akun belum dapat dibaca. Periksa pemasangan V6."});
    if (profile?.role !== "super_admin" || profile?.aktif !== true) return reply(403,{message:"Hanya Administrator aktif yang dapat mengganti kata sandi akun."});
    if (Number(req.headers.get("content-length")) > 4096) return reply(413,{message:"Data formulir terlalu besar."});
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 4096) return reply(413,{message:"Data formulir terlalu besar."});
    let body: Record<string, unknown>;
    try { const parsed=JSON.parse(raw); if (!parsed || typeof parsed!=="object" || Array.isArray(parsed)) throw new Error(); body=parsed; }
    catch {return reply(400,{message:"Data formulir tidak valid."});}
    const userId=body.user_id, password=body.password;
    if (typeof userId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return reply(400,{message:"Pilih akun yang tersedia."});
    if (userId===identity.user.id) return reply(400,{message:"Ubah kata sandi sendiri melalui Ganti Kata Sandi."});
    if (typeof password!=="string" || password.length<8 || new TextEncoder().encode(password).length>72) return reply(400,{message:"Kata sandi minimal 8 karakter dan maksimal 72 byte."});
    const {data:target,error:targetError} = await ctx.supabaseAdmin.from("mess_profiles").select("user_id").eq("user_id",userId).maybeSingle();
    if (targetError) return reply(503,{message:"Akun belum dapat diperiksa."});
    if (!target) return reply(404,{message:"Akun tidak ditemukan di daftar akun Mess."});
    const {error:updateError} = await ctx.supabaseAdmin.auth.admin.updateUserById(userId,{password});
    if (updateError) return reply(502,{message:"Kata sandi belum berhasil diubah. Periksa kebijakan kata sandi Supabase dan coba lagi."});
    return reply(200,{ok:true});
  } catch {return reply(500,{message:"Perubahan kata sandi belum dapat diproses. Periksa fungsi mess-manage-user."});}
}
Deno.serve(handleRequest);
