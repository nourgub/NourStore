import { AdminNav } from "@/components/admin-nav";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">إضافة خدمة جديدة</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
