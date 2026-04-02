import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log("Fetching complaints...");
  const { data, error } = await supabase.from('complaints').select('*');
  console.log("Data:", data);
  if (error) console.error("Error:", error);
}

test();
