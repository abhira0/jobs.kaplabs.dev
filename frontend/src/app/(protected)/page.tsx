import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to analytics as the default page
  redirect("/analytics");
}



