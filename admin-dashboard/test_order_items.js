import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderItems() {
  const { data, error } = await supabase.from('order_items').insert({
    order_id: '27a26e7d-d375-4ce7-afa3-f328417af771',
    product_id: '07864db3-fea1-4f14-befb-1711ca7010c8', // Some valid product id
    product_name: 'Test',
    product_image: 'test.jpg',
    size: '39',
    outsole_model: 'Model 1',
    quantity: 1,
    price: 10000
  });
  console.log('Order Items insert:', error || 'Success');
}

checkOrderItems();
