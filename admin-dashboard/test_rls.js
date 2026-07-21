import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  // Let's see what happens if we insert as guest
  const { data, error } = await supabase.from('orders').insert({
    user_id: null,
    customer_name: 'Test',
    customer_phone: '123',
    customer_address: 'Test',
    total_amount: 100,
    status: 'Diproses'
  });
  console.log('Guest insert:', error || 'Success');

  // Let's try to select
  const { data: selectData, error: selectError } = await supabase.from('orders').select('*').limit(1);
  console.log('Guest select:', selectError || selectData);
}

checkRLS();
