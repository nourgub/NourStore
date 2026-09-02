import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildOrderWhere } from "@/lib/order-filters";
import { statusLabels } from "@/components/status-badge";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const where = buildOrderWhere({
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  const orders = await db.order.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "رقم الطلب",
    "التاجر",
    "المتجر",
    "الهاتف",
    "الخدمة",
    "المبلغ (دج)",
    "طريقة الدفع",
    "الحالة",
    "التاريخ",
  ];

  const rows = orders.map((order) =>
    [
      order.orderNumber,
      order.merchantName,
      order.storeName,
      order.phone,
      order.product.name,
      String(order.product.priceDzd),
      order.paymentMethod,
      statusLabels[order.status] ?? order.status,
      order.createdAt.toISOString(),
    ]
      .map((value) => csvEscape(value))
      .join(","),
  );

  const csv = "﻿" + [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
