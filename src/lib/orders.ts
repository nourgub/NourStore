import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generateSuffix = customAlphabet(alphabet, 6);

export function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `NS-${datePart}-${generateSuffix()}`;
}

export async function getOrderByNumber(orderNumber: string) {
  return db.order.findUnique({
    where: { orderNumber },
    include: { product: true },
  });
}

export function paymentInstructions() {
  return {
    baridimobName: process.env.PAYMENT_BARIDIMOB_NAME || "سيتم تزويدك بالاسم عند التواصل",
    baridimobPhone: process.env.PAYMENT_BARIDIMOB_PHONE || "سيتم تزويدك بالرقم عند التواصل",
    ccpNumber: process.env.PAYMENT_CCP_NUMBER || "سيتم تزويدك بالرقم عند التواصل",
    bankRib: process.env.PAYMENT_BANK_RIB || "سيتم تزويدك بالـ RIB عند التواصل",
    supportWhatsapp: process.env.SUPPORT_WHATSAPP || "سيتم التواصل معك على رقمك مباشرة",
  };
}
