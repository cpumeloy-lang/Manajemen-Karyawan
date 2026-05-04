UPDATE auth.users SET encrypted_password = crypt('Admin123!', gen_salt('bf')) WHERE email = 'admin@hospital.com';  
