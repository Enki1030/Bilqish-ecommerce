import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhglsmwwjudxsgjmdkvy.supabase.co';
const supabaseKey = 'sb_publishable_3O9-HanO0zjMriRO0Y_Wzw_Ez_IJFST';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('products').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
