// Shop constants shared by the browser and the server.

export const CATEGORIES = ["ביגוד", "כלי מטבח", "כלי מיטה ומגבות", "מוצרי חשמל"] as const;

export const MAX_QUANTITY_PER_LINE = 20;

/** The products that existed in the old Wix store (inserted once, on first deploy). */
export const INITIAL_PRODUCTS: { name: string; category: (typeof CATEGORIES)[number]; price: number }[] = [
  { name: "סט סירים", category: "כלי מטבח", price: 160 },
  { name: "קומקום נירוסטה", category: "מוצרי חשמל", price: 50 },
  { name: "קומקום זכוכית משולב", category: "מוצרי חשמל", price: 50 },
  { name: "פלטה לשבת 4 סירים", category: "מוצרי חשמל", price: 80 },
  { name: "מיחם שבת 6 ליטר", category: "מוצרי חשמל", price: 140 },
  { name: "שעון שבת 24 שעות", category: "מוצרי חשמל", price: 20 },
  { name: "בלנדר מוט", category: "מוצרי חשמל", price: 50 },
  { name: "טוסטר לחיצה", category: "מוצרי חשמל", price: 100 },
  { name: "מכשיר פנקייק", category: "מוצרי חשמל", price: 200 },
  { name: "מגהץ קיטור אלחוטי טפאל", category: "מוצרי חשמל", price: 200 },
  { name: "מגהץ קיטור", category: "מוצרי חשמל", price: 200 },
  { name: "סט כלי מיטה", category: "כלי מיטה ומגבות", price: 500 },
  { name: "שמיכה", category: "כלי מיטה ומגבות", price: 0 },
  { name: "סט 4 מגבות פנים + 4 מגבות גוף", category: "כלי מיטה ומגבות", price: 400 },
  { name: "גרביונים", category: "ביגוד", price: 10 },
];
