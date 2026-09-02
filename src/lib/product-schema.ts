import { z } from "zod";

export const productInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "الرابط قصير جدًا")
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "الرابط يجب أن يحتوي أحرفًا لاتينية صغيرة وأرقامًا وشرطات فقط"),
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  tagline: z.string().trim().min(2, "العبارة قصيرة جدًا").max(200),
  description: z.string().trim().min(10, "الوصف قصير جدًا").max(2000),
  category: z.string().trim().min(2, "التصنيف مطلوب").max(60),
  icon: z.string().trim().min(1, "الأيقونة مطلوبة").max(8),
  priceDzd: z.coerce.number().int().min(0, "السعر يجب أن يكون 0 أو أكثر").max(100_000_000),
  features: z
    .array(z.string().trim().min(1))
    .min(1, "أضف ميزة واحدة على الأقل")
    .max(20),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type ProductInput = z.infer<typeof productInputSchema>;
