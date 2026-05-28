"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActStore } from "@/store/useActStore";
import { authClient } from "@/lib/auth-client";
import {
  ClipboardList,
  Home,
  Users,
  Building,
  Warehouse,
  Square,
  SquareDashed,
  Box,
  Zap,
  Database,
  Table,
  FileOutput,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

const NAV_ITEMS = [
  { group: "Документ" },
  { href: "/general", icon: Home, label: "Загальні дані" },
  { href: "/static", icon: Users, label: "Комісія", color: "text-orange hover:bg-orange/10" },
  { href: "/techpass", icon: Building, label: "Техпаспорт" },
  { group: "Пошкодження" },
  { href: "/roof", icon: Warehouse, label: "Дах / Перекриття" },
  { href: "/windows", icon: Square, label: "Вікна / Двері" },
  { href: "/walls", icon: SquareDashed, label: "Стіни / Стеля" },
  { href: "/floors", icon: Box, label: "Підлоги" },
  { href: "/facade", icon: Building, label: "Фасад / Фунд." },
  { href: "/eng", icon: Zap, label: "Інженерія" },
  { group: "База" },
  { href: "/database", icon: Database, label: "База об'єктів" },
  { group: "Підсумок" },
  { href: "/volumes", icon: Table, label: "Зведена таблиця" },
  { href: "/export", icon: FileOutput, label: "Висновки / Експорт", color: "text-green hover:bg-greenDim" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalSum } = useActStore();
  const { data: session } = authClient.useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const formattedSum = totalSum.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <aside className="w-[240px] bg-surface border-r border-border flex flex-col fixed inset-y-0 z-50 custom-scrollbar overflow-y-auto">
      {/* Логотип */}
      <div className="p-[18px_16px_14px] border-b border-border flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] bg-gradient-to-br from-accent to-[#7c5cff] rounded-[9px] flex items-center justify-center text-lg shadow-lg">
          <ClipboardList className="text-white" size={20} />
        </div>
        <div>
          <div className="font-extrabold text-[15px] leading-tight">ActBuilder</div>
          <div className="text-[10px] text-text3 font-medium tracking-wide uppercase">єВідновлення</div>
        </div>
      </div>

      {/* Загальна сума */}
      <div className="m-2.5 bg-greenDim border border-green/25 rounded-lg p-[10px_12px]">
        <div className="text-[10px] text-text3 uppercase tracking-wide font-semibold mb-1">Загальна сума</div>
        <div className="text-lg font-extrabold text-green flex items-center gap-1.5">
          {formattedSum} <span className="text-[11px] font-medium text-text3">грн</span>
        </div>
      </div>

      {/* Навігація */}
      <nav className="p-[6px_8px] flex-1">
        {NAV_ITEMS.map((item, idx) => {
          if (item.group) {
            return (
              <div key={idx} className="text-[10px] text-text3 uppercase tracking-wide font-bold p-[8px_8px_3px] mt-2">
                {item.group}
              </div>
            );
          }

          const isActive = pathname === item.href;
          const Icon = item.icon!;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2.5 p-[8px_10px] rounded-lg text-[13px] font-medium transition-colors duration-150 mb-0.5
                ${
                  isActive
                    ? "bg-accentGlow text-accent2 border border-accent/25"
                    : `text-text2 hover:bg-surface2 hover:text-textMain ${item.color || ""}`
                }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Футер */}
      <div className="p-[10px_14px] border-t border-border mt-auto">
        <div className="flex items-center gap-2 p-[8px_10px] bg-surface2 border border-border rounded-lg mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold truncate">{session?.user?.email || "Завантаження..."}</div>
            <div className="text-[10px] text-green font-semibold flex items-center gap-1">✓ Готово</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 bg-surface3 border border-border2 rounded-md flex items-center justify-center hover:border-red transition-colors"
            title="Вийти"
          >
            <LogOut size={14} className="text-text2 hover:text-red" />
          </button>
        </div>
        <div className="text-[10px] text-text3 text-center">Developed by V. Korchma</div>
      </div>
    </aside>
  );
}
