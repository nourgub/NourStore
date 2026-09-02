import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDzd(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}
