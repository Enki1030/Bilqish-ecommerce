export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Laced' | 'Slip-on';
  image: string;
  sizes: number[];
}

export const products: Product[] = [
  {
    id: 'G21',
    name: 'G21 Hitam',
    description: 'Sepatu Slip-on kasual warna hitam polos, cocok untuk aktivitas harian.',
    price: 85000,
    category: 'Slip-on',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
  },
  {
    id: 'G80',
    name: 'G80 Hitam',
    description: 'Sepatu pantofel Slip-on hitam elegan untuk acara formal atau kerja.',
    price: 85000,
    category: 'Slip-on',
    image: 'https://images.unsplash.com/photo-1620803450917-7a2e564cc833?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
  },
  {
    id: 'T02',
    name: 'T02 Hitam',
    description: 'Sepatu pantofel premium dengan tali, desain klasik warna hitam mengkilap.',
    price: 85000,
    category: 'Laced',
    image: 'https://images.unsplash.com/photo-1614252339460-5f04b2b2aeb5?q=80&w=600&auto=format&fit=crop',
    sizes: [39, 40, 41, 42, 43],
  },
  {
    id: 'G70',
    name: 'G70 Hitam',
    description: 'Sepatu Slip-on modern desain eksekutif muda warna hitam.',
    price: 85000,
    category: 'Slip-on',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=600&auto=format&fit=crop', 
    sizes: [39, 40, 41, 42, 43],
  }
];
