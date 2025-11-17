import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { parseJwt } from "@/utils/jwt";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt_token")?.value ?? null;
  if (!token) {
    redirect("/login");
  }
  try {
    const payload = parseJwt(token);
    const isExpired = payload && typeof payload.exp === 'number' && Date.now() / 1000 >= payload.exp;
    if (!payload || isExpired) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }
  return <>{children}</>;
}


