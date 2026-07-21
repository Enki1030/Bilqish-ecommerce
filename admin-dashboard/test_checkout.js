import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCheckout() {
  // Let's just try to insert into order_items with a fake order_id. It will fail on FK constraint,
  // but if the payload type is wrong (e.g. number for text column), it might throw a different error first!
  const { data: item, error: itemError } = await supabase.from('order_items').insert({
    order_id: '00000000-0000-0000-0000-000000000000', 
    product_id: '07864db3-fea1-4f14-befb-1711ca7010c8',
    product_name: 'Test',
    product_image: 'test.png',
    size: 39, // NUMBER!
    outsole_model: 'Model 1',
    quantity: 1,
    price: 100
  });

  if (itemError) {
    console.error('Item Insert Error:', itemError);
  } else {
    console.log('Item Insert Success:', item);
  }
}

testCheckout();
