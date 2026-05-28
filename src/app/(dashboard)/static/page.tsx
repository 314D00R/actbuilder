"use client";

import { useStaticStore } from "@/store/useStaticStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileSignature, Users, PenTool, Plus, Trash2 } from "lucide-react";

export default function StaticDataPage() {
  const store = useStaticStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-4 rounded-xl flex gap-3 items-start shadow-sm">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm mb-1">Сталі дані (Не видаляються)</h3>
          <p className="text-xs opacity-90 leading-relaxed">
            Ці дані залишаються збереженими навіть при створенні нового об&apos;єкта. Заповніть їх один раз для своєї
            робочої групи чи комісії.
          </p>
        </div>
      </div>

      <Card className="border-l-4 border-l-orange-500 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileSignature size={18} className="text-orange-500" /> Рішення / Розпорядження
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Рішення №</Label>
            <Input
              type="text"
              placeholder="249"
              value={store.order_no}
              onChange={(e) => store.setField("order_no", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Від (Дата)</Label>
            <Input
              type="text"
              placeholder="08.09.2023"
              value={store.order_date}
              onChange={(e) => store.setField("order_date", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs uppercase text-muted-foreground">Назва рішення (повна)</Label>
            <Input
              type="text"
              placeholder="«Про створення комісії...»"
              value={store.order_name}
              onChange={(e) => store.setField("order_name", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users size={18} className="text-orange-500" /> Склад комісії (для шапки Акта)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Голова (Називний: Хто?)</Label>
              <Input
                type="text"
                placeholder="Ігор Сурнін"
                value={store.comm_head_nom}
                onChange={(e) => store.setField("comm_head_nom", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Голова (Родовий: Кого?)</Label>
              <Input
                type="text"
                placeholder="Ігоря Сурніна"
                value={store.comm_head_gen}
                onChange={(e) => store.setField("comm_head_gen", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Заступник (Родовий)</Label>
              <Input
                type="text"
                placeholder="Руслана Саїнчука"
                value={store.comm_deputy}
                onChange={(e) => store.setField("comm_deputy", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Секретар (Родовий)</Label>
              <Input
                type="text"
                placeholder="Євгена Сологуба"
                value={store.comm_sec}
                onChange={(e) => store.setField("comm_sec", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-xs uppercase text-muted-foreground">Члени комісії (Родовий, через кому)</Label>
            <Input
              type="text"
              placeholder="Ольги Субботкіної, Олени Липач..."
              value={store.comm_members}
              onChange={(e) => store.setField("comm_members", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <PenTool size={18} className="text-orange-500" /> Підписи комісії (В кінці Акта)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {store.signs.map((sign, index) => (
            <div
              key={sign.id}
              className="flex flex-col md:flex-row items-end gap-3 p-4 bg-secondary/30 border border-border rounded-xl"
            >
              <div className="space-y-2 w-full md:w-1/3">
                <Label className="text-xs uppercase text-muted-foreground">Роль</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
                  value={sign.role}
                  onChange={(e) => store.updateSign(sign.id, "role", e.target.value)}
                >
                  <option value="Голова комісії">Голова комісії</option>
                  <option value="Заступник голови комісії">Заступник голови комісії</option>
                  <option value="Секретар комісії">Секретар комісії</option>
                  <option value="Член комісії">Член комісії</option>
                </select>
              </div>
              <div className="space-y-2 w-full md:flex-1">
                <Label className="text-xs uppercase text-muted-foreground">ПІБ (Називний)</Label>
                <Input
                  type="text"
                  placeholder="Ольга Субботкіна"
                  value={sign.name}
                  onChange={(e) => store.updateSign(sign.id, "name", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => store.removeSign(sign.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed border-2 border-orange-500/40 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500 h-11 mt-2"
            onClick={store.addSign}
          >
            <Plus size={16} className="mr-2" /> Додати підпис комісії
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
