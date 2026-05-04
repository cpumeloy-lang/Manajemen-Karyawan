import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  console.log("Fetching first employee...");
  const { data: emp, error: fetchErr } = await supabase.from('employees').select('id, nama').limit(1).single();
  
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  
  console.log("Employee:", emp);
  
  const newName = emp.nama + ' (Edited)';
  console.log(`Updating name to: ${newName}`);
  
  const { data: updated, error: updateErr } = await supabase.from('employees').update({ nama: newName }).eq('id', emp.id).select().single();
  
  if (updateErr) {
    console.error("Update Error:", updateErr);
    return;
  }
  
  console.log("Updated successfully. Result:", updated.nama);
  
  console.log("Reverting back...");
  await supabase.from('employees').update({ nama: emp.nama }).eq('id', emp.id);
  console.log("Done.");
}

testUpdate();
