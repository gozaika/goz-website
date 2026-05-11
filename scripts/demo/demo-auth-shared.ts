import { isAllowedDemoSupabaseUrl } from "@gozaika/utils";

export const demoPassword = "GozaikaDemo@123";

export interface DemoUser {
  readonly role: "consumer" | "restaurant";
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly area: string;
  readonly cuisine?: readonly string[];
}

export const restaurantDemoUsers: readonly DemoUser[] = [
  {
    role: "restaurant",
    fullName: "Biryani Baithak",
    email: "biryani.baithak@gozaika.example",
    phone: "+919000100001",
    area: "Banjara Hills",
    cuisine: ["Hyderabadi", "Biryani", "Mughlai"],
  },
  {
    role: "restaurant",
    fullName: "Charminar Chai Co.",
    email: "charminar.chai.co@gozaika.example",
    phone: "+919000100002",
    area: "Old City",
    cuisine: ["Irani Chai", "Snacks", "Bakery"],
  },
  {
    role: "restaurant",
    fullName: "Deccan Dosa House",
    email: "deccan.dosa.house@gozaika.example",
    phone: "+919000100003",
    area: "Madhapur",
    cuisine: ["South Indian", "Breakfast", "Vegetarian"],
  },
  {
    role: "restaurant",
    fullName: "Golconda Grills",
    email: "golconda.grills@gozaika.example",
    phone: "+919000100004",
    area: "Gachibowli",
    cuisine: ["Kebabs", "Grill", "North Indian"],
  },
  {
    role: "restaurant",
    fullName: "HITEC Handi",
    email: "hitec.handi@gozaika.example",
    phone: "+919000100005",
    area: "HITEC City",
    cuisine: ["Indian", "Curries", "Family Meals"],
  },
];

export const consumerDemoUsers: readonly DemoUser[] = [
  ["Aarav Reddy", "aarav.reddy@gozaika.example", "+919100200001", "Jubilee Hills"],
  ["Ananya Sharma", "ananya.sharma@gozaika.example", "+919100200002", "Kondapur"],
  ["Rohan Khan", "rohan.khan@gozaika.example", "+919100200003", "Tolichowki"],
  ["Meera Iyer", "meera.iyer@gozaika.example", "+919100200004", "Secunderabad"],
  ["Vikram Rao", "vikram.rao@gozaika.example", "+919100200005", "Ameerpet"],
  ["Sana Fatima", "sana.fatima@gozaika.example", "+919100200006", "Mehdipatnam"],
  ["Arjun Nair", "arjun.nair@gozaika.example", "+919100200007", "Miyapur"],
  ["Priya Menon", "priya.menon@gozaika.example", "+919100200008", "Kukatpally"],
  ["Kabir Ali", "kabir.ali@gozaika.example", "+919100200009", "Begumpet"],
  ["Nisha Verma", "nisha.verma@gozaika.example", "+919100200010", "Manikonda"],
  ["Dev Patel", "dev.patel@gozaika.example", "+919100200011", "Nallagandla"],
  ["Zoya Siddiqui", "zoya.siddiqui@gozaika.example", "+919100200012", "Lakdikapul"],
  ["Ishaan Gupta", "ishaan.gupta@gozaika.example", "+919100200013", "Madhapur"],
  ["Kavya Reddy", "kavya.reddy@gozaika.example", "+919100200014", "Banjara Hills"],
  ["Sameer Das", "sameer.das@gozaika.example", "+919100200015", "Gachibowli"],
].map(([fullName, email, phone, area]) => ({
  role: "consumer" as const,
  fullName,
  email,
  phone,
  area,
}));

export const allDemoUsers = [...restaurantDemoUsers, ...consumerDemoUsers] as const;

export function readDemoEnvironment() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowRemote = process.env.DEMO_SEED_ALLOW_REMOTE === "true";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  if (!isAllowedDemoSupabaseUrl(supabaseUrl, allowRemote)) {
    throw new Error("Refusing to run demo auth script against a remote Supabase URL.");
  }

  return { supabaseUrl, serviceRoleKey };
}
