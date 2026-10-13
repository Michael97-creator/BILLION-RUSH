// Supabase Edge Function — walk-away
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { sessionId } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { data: session, error } = await supabase
      .from("game_sessions")
      .select("id,status,money_reached,player_id")
      .eq("id", sessionId)
      .eq("player_id", user.id)
      .single();

    if (error) throw error;
    if (session.status !== "active") throw new Error("Game is no longer active.");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: updateError } = await admin
      .from("game_sessions")
      .update({ status: "walked_away", finished_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("player_id", user.id)
      .eq("status", "active");

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      status: "walked_away",
      moneyReached: session.money_reached
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
