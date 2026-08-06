import {
  Package,
  BookOpen,
  Laptop,
  Shirt,
  Sofa,
  Coffee,
  Wrench,
  HelpCircle,
} from 'lucide-react'

// Static category definitions — icons + names used for UI filters
// Counts are now dynamic (fetched from Supabase)
export const CATEGORIES = [
  { name: 'School Supplies', Icon: Package },
  { name: 'Books', Icon: BookOpen },
  { name: 'Tech Accessories', Icon: Laptop },
  { name: 'Clothing', Icon: Shirt },
  { name: 'Furniture', Icon: Sofa },
  { name: 'Food & Drinks', Icon: Coffee },
  { name: 'Services', Icon: Wrench },
  { name: 'Other', Icon: HelpCircle },
]
