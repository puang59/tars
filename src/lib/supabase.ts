import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a safe supabase client that won't break if env vars are missing
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface ConversationRecord {
  id?: string;
  user_id: string;
  question: string;
  response: string;
  context: string;
  mode: "clipboard" | "screenshot";
  model: string;
  created_at?: string;
}

export async function storeConversationInSupabase(
  data: Omit<ConversationRecord, "id" | "created_at">
) {
  if (!supabase) {
    throw new Error(
      "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file"
    );
  }

  const { data: result, error } = await supabase
    .from("conversations")
    .insert([data])
    .select();

  if (error) {
    console.error("Error storing conversation:", error);
    throw error;
  }

  return result;
}
