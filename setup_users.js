import { createClient } from '@supabase/supabase-js';

const url = 'https://qjuttlaufsbakxrlhluc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdXR0bGF1ZnNiYWt4cmxobHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQ4NTQsImV4cCI6MjA5MDU1MDg1NH0.W_g5MVujnLzixEx_wnsl--AZsBDOwkr4noM9Bi3_73k';
const supabase = createClient(url, key);

async function createAccounts() {
  console.log("Setting up Admin User...");
  const adminRes = await supabase.auth.signUp({ 
    email: 'admin@city.gov', 
    password: 'password123' 
  });
  
  if (adminRes.data?.user) {
    const res = await supabase.from('profiles').insert({ id: adminRes.data.user.id, role: 'Official' });
    if(res.error) console.log("Failed to assign Official role:", res.error.message);
    else console.log("✅ Admin created and assigned Official role.");
  } else {
    console.error("Failed to create Admin:", adminRes.error?.message);
  }
  
  console.log("\nSetting up Citizen User...");
  const citizenRes = await supabase.auth.signUp({ 
    email: 'citizen@email.com', 
    password: 'password123' 
  });
  
  if (citizenRes.data?.user) {
     // I will use 'Public' since the UI supports both, and the database Check constraint requires it.
    const res2 = await supabase.from('profiles').insert({ id: citizenRes.data.user.id, role: 'Public' });
    if(res2.error) console.log("Failed to assign Public role:", res2.error.message);
    else console.log("✅ Citizen created and assigned Public role.");
  } else {
    console.error("Failed to create Citizen:", citizenRes.error?.message);
  }
  
  console.log("\nFinished user setup!");
}

createAccounts();
