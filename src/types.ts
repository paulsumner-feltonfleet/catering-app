export type Item = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  code?: string;
  sortOrder: number;
  archived: boolean;
  updatedAt?: number;
};

export type WeekEntry = {
  quantity: number;
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  sortOrder: number;
};

export type Week = {
  id: string;
  weekEnding: number;
  notes?: string;
  entries: Record<string, WeekEntry>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export const ALLOWED_EMAILS = [
  "catering@feltonfleet.co.uk",
  "paul.sumner@feltonfleet.co.uk",
] as const;

export const CATEGORY_ORDER = [
  "Dry Stores",
  "Pastry",
  "FOH",
  "Fish",
  "Bakery",
  "Meat",
  "Frozen",
  "Dairy",
  "Fruit & Veg",
  "Retail",
  "Cleaning",
  "Disposables",
] as const;

export type CategoryName = (typeof CATEGORY_ORDER)[number];
