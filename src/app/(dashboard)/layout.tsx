import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

const manrope = Manrope({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ActBuilder · єВідновлення",
  description: "Генератор актів обстеження",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" data-theme="dark">
      <body className={`${manrope.className} bg-bg text-textMain min-h-screen flex text-sm custom-scrollbar`}>
        <Sidebar />
        <div className="flex-1 flex flex-col ml-60">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
