export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Laced' | 'Slip-on' | string;
  model?: string;
  image: string;
  image_url?: string;
  sizes: number[] | string[];
  stock?: number;
}

export const products: Product[] = [
  {
    id: 'G21',
    name: 'G21 Hitam',
    description: 'Sepatu Slip-on kasual warna hitam polos, cocok untuk aktivitas harian dan kantor.',
    price: 85000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'G80',
    name: 'G80 Hitam',
    description: 'Sepatu pantofel Slip-on hitam elegan untuk acara formal, wisuda, atau kerja eksekutif.',
    price: 85000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1620803450917-7a2e564cc833?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'T02',
    name: 'T02 Hitam',
    description: 'Sepatu pantofel premium dengan tali klasik, desain formal warna hitam mengkilap berkelas.',
    price: 85000,
    category: 'Laced',
    model: 'T',
    image: 'https://images.unsplash.com/photo-1614252339460-5f04b2b2aeb5?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'G70',
    name: 'G70 Hitam',
    description: 'Sepatu Slip-on modern desain eksekutif muda warna hitam dengan material kulit sintetis pilihan.',
    price: 85000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=600&auto=format&fit=crop', 
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'G20',
    name: 'G20 Hitam',
    description: 'Sepatu Slip-on fleksibel dengan sol empuk dan jahitan rapi untuk kenyamanan mobilitas tinggi.',
    price: 80000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'G83',
    name: 'G83 Hitam',
    description: 'Pantofel slip-on hitam dengan siluet ramping dan aksen jahitan presisi khas pengrajin Bilqish.',
    price: 85000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'G73',
    name: 'G73 Hitam',
    description: 'Sepatu slip-on formal sol TPR anti-slip dengan durabilitas tinggi untuk pemakaian harian.',
    price: 85000,
    category: 'Slip-on',
    model: 'G',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  },
  {
    id: 'T01',
    name: 'T01 Hitam',
    description: 'Pantofel tali klasik Oxford style hitam legam, cocok dipadukan dengan celana bahan dan jas.',
    price: 85000,
    category: 'Laced',
    model: 'T',
    image: 'https://images.unsplash.com/photo-1582895181583-4902b79a83a4?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
    stock: 45
  }
];
