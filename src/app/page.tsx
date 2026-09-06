import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";

export default async function HomePage() {
  const teacher = await getCurrentTeacher();
  redirect(teacher ? "/dashboard" : "/login");
}
