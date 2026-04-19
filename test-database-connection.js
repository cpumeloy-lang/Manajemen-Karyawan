import { supabase } from './services/supabaseClient.ts';

const testDatabaseConnection = async () => {
    console.log('🔍 Testing database connection...');
    
    try {
        // Test basic connection
        const { data, error } = await supabase.from('units').select('count').limit(1);
        
        if (error) {
            if (error.message.includes('relation "public.units" does not exist')) {
                console.log('❌ Tables not found. Database needs setup.');
                return false;
            }
            throw error;
        }
        
        console.log('✅ Database connection successful!');
        return true;
        
    } catch (err: any) {
        console.error('❌ Connection failed:', err.message);
        return false;
    }
};

// Run test
testDatabaseConnection();