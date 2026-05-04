import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gwfymzfrxsvtmtdhryft.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3ZnltemZyeHN2dG10ZGhyeWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDAyODYsImV4cCI6MjA5MTkxNjI4Nn0.mOvRgrQ3NbNM7sezB4ndeHj3ngH1IMa07kF1wdbnIZM';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false
    }
});

async function run() {
  console.log('Logging in as admin to bypass RLS...');
  const adminSignIn = await supabase.auth.signInWithPassword({
      email: 'admin@hospital.com',
      password: 'password123'
  });
  
  if (adminSignIn.error) {
      console.error('Failed to login as admin. Check if admin@hospital.com exists with password123.');
      return;
  }

  let { data: units, error: unitsError } = await supabase.from('units').select('id, nama').limit(1);
  if (unitsError) {
      console.error('Error fetching units:', unitsError.message);
      return;
  }

  if (!units || units.length === 0) {
      console.log('No units found, creating a default Rawat Inap unit...');
      const { data: newUnit, error: insertError } = await supabase.from('units').insert({ nama: 'Rawat Inap' }).select();
      if (insertError) {
          console.error('Failed to create default unit:', insertError.message);
          return;
      }
      units = newUnit;
  }

  const unitId = units[0].id;
  console.log(`Will manage unit: ${units[0].nama} (${unitId})`);

  const email = 'kepalaruangan@hospital.com';
  const password = 'password123';
  
  console.log(`Creating auth user: ${email}...`);
  
  // Note: Since we are logged in as admin, we can't signUp easily without logging out.
  // We should create a temporary client for signUp.
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  let { data: authData, error: authError } = await tempClient.auth.signUp({
    email,
    password
  });
  
  if (authError && authError.message.includes('User already registered')) {
    console.log('User already registered, getting ID...');
    const signInRes = await tempClient.auth.signInWithPassword({ email, password });
    authData = signInRes.data;
  } else if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  
  const userId = authData?.user?.id;
  if (!userId) {
      console.error('Could not get user ID');
      return;
  }
  console.log(`User ID: ${userId}`);

  const profile = {
    user_id: userId,
    email: email,
    nama: 'Kepala Ruangan',
    role: 'kepala_ruangan',
    jabatan: 'Kepala Ruangan',
    departemen: 'Keperawatan',
    status: 'Aktif',
    hireDate: new Date().toISOString().split('T')[0],
    sisaCuti: 12,
    managed_unit_id: unitId,
    unitKerjaId: unitId,
    telepon: '08123456789'
  };

  console.log('Upserting employee profile...');
  // Use the admin client to insert to bypass RLS
  const { error: profileError } = await supabase
    .from('employees')
    .upsert(profile, { onConflict: 'email' });

  if (profileError) {
      console.error('Profile error:', profileError.message);
      return;
  }

  console.log(`\n✅ SUKSES! Akun Kepala Ruangan berhasil dibuat.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Unit: ${units[0].nama}`);
}

run();
