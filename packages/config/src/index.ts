export const BRAND_COLORS = {
  saffron: "#FF6B35",
  saffronLight: "#FFF0E8",
  forest: "#1A5C38",
  forestLight: "#EAF3DE",
  gold: "#D4A017",
  cream: "#FFF8F0",
  charcoal: "#2D2D2D",
  paper: "#FFFFFF",
  danger: "#B42318",
  success: "#027A48",
} as const;

export const BRAND_FONTS = {
  display: "Playfair Display",
  sans: "Inter",
  hindi: "Hind",
} as const;

export const DEFAULT_CITY = {
  code: "HYDERABAD",
  name: "Hyderabad",
  neighborhoods: ["Banjara Hills", "Jubilee Hills", "Kondapur"],
} as const;

export const EXPANSION_CITY_CODES = [
  "BENGALURU",
  "MUMBAI",
  "DELHI",
  "GURUGRAM",
  "PUNE",
  "CHENNAI",
  "GOA",
  "AHMEDABAD",
  "KOLKATA",
  "JAIPUR",
  "KOCHI",
] as const;

export const ENV_KEYS = {
  publicSupabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  publicSupabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  expoSupabaseUrl: "EXPO_PUBLIC_SUPABASE_URL",
  expoSupabaseAnonKey: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  razorpayKeyId: "RAZORPAY_KEY_ID",
  razorpayKeySecret: "RAZORPAY_KEY_SECRET",
  razorpayWebhookSecret: "RAZORPAY_WEBHOOK_SECRET",
} as const;

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gozaika.vercel.app";
