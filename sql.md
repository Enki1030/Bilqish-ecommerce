## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `price` | `numeric` |  |
| `model` | `text` |  Nullable |
| `sizes` | `_text` |  |
| `image_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `model_type` | `text` |  Nullable |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `customer_name` | `text` |  |
| `customer_phone` | `text` |  |
| `customer_address` | `text` |  |
| `total_amount` | `int4` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `order_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `product_name` | `text` |  |
| `product_image` | `text` |  Nullable |
| `size` | `text` |  |
| `outsole_model` | `text` |  |
| `quantity` | `int4` |  |
| `price` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `craftsmen`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `phone` | `text` |  |
| `material_type` | `text` |  |
| `address` | `text` |  Nullable |
| `check_interval_days` | `int4` |  Nullable |
| `last_checked_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `raw_materials`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `craftsman_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `category` | `text` |  |
| `status` | `text` |  |
| `delay_days` | `int4` |  Nullable |
| `notes` | `text` |  Nullable |
| `linked_models` | `jsonb` |  Nullable |
| `last_checked_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `stock_quantity` | `int4` |  Nullable |
| `material_component` | `text` |  Nullable |
| `sub_type` | `text` |  Nullable |

## Table `craftsmen_material_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `material_id` | `uuid` |  |
| `craftsman_id` | `uuid` |  |
| `craftsman_name` | `text` |  |
| `material_name` | `text` |  |
| `status` | `text` |  |
| `notes` | `text` |  Nullable |
| `checked_at` | `timestamptz` |  |

## Table `user_addresses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `label_name` | `text` |  Nullable |
| `recipient_name` | `text` |  |
| `recipient_phone` | `text` |  |
| `province` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `district` | `text` |  Nullable |
| `postal_code` | `text` |  Nullable |
| `full_address` | `text` |  |
| `benchmark_notes` | `text` |  Nullable |
| `latitude` | `float8` |  Nullable |
| `longitude` | `float8` |  Nullable |
| `is_default` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `articles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `slug` | `text` |  Unique |
| `excerpt` | `text` |  Nullable |
| `content` | `text` |  |
| `cover_image` | `text` |  Nullable |
| `category` | `text` |  |
| `tags` | `_text` |  Nullable |
| `author_name` | `text` |  Nullable |
| `featured_product_ids` | `_uuid` |  Nullable |
| `craftsman_id` | `uuid` |  Nullable |
| `status` | `text` |  |
| `read_time_minutes` | `int4` |  Nullable |
| `views_count` | `int4` |  Nullable |
| `meta_title` | `text` |  Nullable |
| `meta_description` | `text` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `cart_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `variant_key` | `text` |  |
| `product_id` | `uuid` |  |
| `name` | `text` |  |
| `image` | `text` |  Nullable |
| `price` | `numeric` |  |
| `mode` | `text` |  |
| `size` | `text` |  |
| `stitching` | `text` |  Nullable |
| `outsole` | `text` |  Nullable |
| `insole` | `text` |  Nullable |
| `quantity` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## RLS Policies

### `products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Anyone can read products` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable update for all users` | UPDATE | public | PERMISSIVE | `true` | — |
| `Enable insert for authenticated users only` | INSERT | public | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `order_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | public | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `craftsmen`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public delete craftsmen` | DELETE | public | PERMISSIVE | `true` | — |
| `Allow public update craftsmen` | UPDATE | public | PERMISSIVE | `true` | — |
| `Allow public insert craftsmen` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public read craftsmen` | SELECT | public | PERMISSIVE | `true` | — |

### `craftsmen_material_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public insert craftsmen_material_logs` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public read craftsmen_material_logs` | SELECT | public | PERMISSIVE | `true` | — |

### `raw_materials`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public delete raw_materials` | DELETE | public | PERMISSIVE | `true` | — |
| `Allow public update raw_materials` | UPDATE | public | PERMISSIVE | `true` | — |
| `Allow public insert raw_materials` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public read raw_materials` | SELECT | public | PERMISSIVE | `true` | — |

### `user_addresses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow users to delete own addresses` | DELETE | public | PERMISSIVE | `true` | — |
| `Allow users to update own addresses` | UPDATE | public | PERMISSIVE | `true` | — |
| `Allow users to insert own addresses` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow users to read own addresses` | SELECT | public | PERMISSIVE | `true` | — |

### `articles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admins can delete articles` | DELETE | authenticated | PERMISSIVE | `true` | — |
| `Admins can update articles` | UPDATE | authenticated | PERMISSIVE | `true` | — |
| `Admins can insert articles` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Admins can view all articles` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Public can view published articles` | SELECT | public | PERMISSIVE | `(status = 'Published'::text)` | — |

### `cart_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cart_delete_own` | DELETE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `cart_update_own` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `cart_insert_own` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `cart_select_own` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

