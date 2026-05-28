"use client";

import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/general": "Загальні дані",
  "/static": "Комісія (Сталі дані)",
  "/techpass": "Техпаспорт",
  "/roof": "Дах / Перекриття",
  "/windows": "Вікна / Двері",
  "/walls": "Стіни / Стеля",
  "/floors": "Підлоги",
  "/facade": "Фасад / Фундамент",
  "/eng": "Інженерія",
  "/volumes": "Зведена таблиця",
  "/export": "Висновки / Експорт",
  "/database": "База об'єктів",
};

export default function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "ActBuilder";

  return (
    <header className="h-[60px] bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-base font-bold">{title}</h1>
        <div className="text-[11px] text-text3 mt-[1px]">ActBuilder · єВідновлення</div>
      </div>

      <div className="flex items-center gap-2.5">
        <a
          href="https://docs.google.com/document/d/1iVmeanEzfIvx4yjna28QHMFSGCaN8J-GzgyJZ3ZUn7U/edit"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 bg-surface2 border border-border2 text-text2 px-[13px] py-1.5 rounded-lg text-xs font-semibold hover:border-accent hover:text-accent2 transition-colors"
        >
          <BookOpen size={14} />
          Інструкція
        </a>
      </div>
    </header>
  );
}
