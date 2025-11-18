import type { Metadata } from "next";
import Link from "next/link";
import ClientNav from "@/components/nav/ClientNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "KapLabs Jobs/Internships",
  description: "Track and manage jobs/internships from simplify repo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b border-default backdrop-blur supports-[backdrop-filter]:bg-black/40">
            <nav className="container-px mx-auto flex h-16 items-center justify-between">
              <Link href="/" className="text-[15px] font-semibold tracking-tight">
                KapLabs Jobs
              </Link>
              <ClientNav />
            </nav>
          </header>
          <main className="container-px mx-auto w-full max-w-6xl flex-1 py-8">{children}</main>
          <footer className="container-px mx-auto w-full max-w-6xl py-8 text-xs text-muted">
            <p suppressHydrationWarning>© {new Date().getFullYear()} KapLabs Jobs</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
