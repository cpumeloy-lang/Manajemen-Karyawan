import { createClient } from '@supabase/supabase-js';
import { mapEmployeeToDatabase } from './utils/dataMapping.js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching one employee...');
  const { data: emp, error: fetchErr } = await supabase.from('employees').select('*').limit(1).single();
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  
  console.log('Original DB Employee Name:', emp.nama);
  
  // Simulate UI Employee state
  const uiEmployee = {
    ...emp,
    ktpNumber: emp.ktp_number,
    isVerified: emp.is_verified,
    nama: emp.nama + ' Edited', // CHANGE NAME
    compensation: {
      gajiPokok: 5000,
      tunjanganProfesi: 2000
    }
  };
  
  console.log('UI Employee new name:', uiEmployee.nama);
  
  // Map to DB
  const updateData = mapEmployeeToDatabase(uiEmployee);
  
  console.log('Mapped updateData payload:', JSON.stringify(updateData, null, 2));
  
  // Update
  console.log('Sending update to Supabase...');
  const { data: updated, error: updateErr } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', emp.id)
    .select()
    .single();
    
  if (updateErr) {
    console.error('Update Error:', updateErr);
  } else {
    console.log('Successfully updated DB!');
    console.log('Returned Employee Name:', updated.nama);
  }
  
  // Revert
  await supabase.from('employees').update({ nama: emp.nama }).eq('id', emp.id);
  console.log('Reverted.');
}

run();
