import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://bhglsmwwjudxsgjmdkvy.supabase.co',
  'sb_publishable_3O9-HanO0zjMriRO0Y_Wzw_Ez_IJFST'
);

async function main() {
  // Step 1: cek apakah kolom model_type sudah ada dengan fetch sample
  const { data: sample, error: sampleErr } = await sb
    .from('products')
    .select('id, name, model, category')
    .limit(1);

  if (sampleErr) {
    console.log('Fetch error:', sampleErr.message);
    return;
  }

  const hasModelType = 'model_type' in (sample[0] || {});
  console.log('model_type column exists:', hasModelType);

  if (!hasModelType) {
    console.log('kolom model_type BELUM ADA - perlu dibuat via Supabase Dashboard SQL Editor');
  }

  // Step 2: Ambil semua produk dan update model_type secara manual via update per-row
  const { data: allProducts, error: fetchErr } = await sb
    .from('products')
    .select('id, name, model, category, model_type');

  if (fetchErr) {
    console.log('Error fetching products:', fetchErr.message);
    return;
  }

  console.log('\nSemua produk dan model_type saat ini:');
  allProducts.forEach(p => {
    const expectedType = p.model ? p.model[0].toUpperCase() : (p.category === 'Laced' ? 'T' : 'G');
    console.log(`  ${p.name} | model: ${p.model} | model_type: ${p.model_type || 'NULL'} | expected: ${expectedType}`);
  });

  // Step 3: Update produk yang model_type-nya NULL atau salah
  let updated = 0;
  for (const p of allProducts) {
    const expectedType = p.model ? p.model[0].toUpperCase() : (p.category === 'Laced' ? 'T' : 'G');
    if (p.model_type !== expectedType) {
      const { error: updateErr } = await sb
        .from('products')
        .update({ model_type: expectedType })
        .eq('id', p.id);
      if (updateErr) {
        console.log(`  ERROR updating ${p.name}:`, updateErr.message);
      } else {
        console.log(`  ✓ Updated ${p.name} -> model_type: ${expectedType}`);
        updated++;
      }
    }
  }

  console.log(`\nSelesai. ${updated} produk diupdate.`);
}

main();
