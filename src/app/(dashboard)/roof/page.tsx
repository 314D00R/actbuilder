"use client";

import { useActStore } from "@/store/useActStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DB } from "@/lib/constants";

const ROOF_CBS = [
  { id: "1", label: "п.1. Локально шифер/черепиця" },
  { id: "3", label: "п.3. Заміна без крокв" },
  { id: "4", label: "п.4. З кроквами до 25%" },
  { id: "5", label: "п.5. З кроквами більше 25%" },
];

const OVER_CBS = [
  { id: "16", label: "п.16. Розбирання дерев'яних" },
  { id: "17", label: "п.17. Влаштування дерев'яних" },
  { id: "18", label: "п.18. Розбирання з/б" },
  { id: "19", label: "п.19. Відновлення з/б" },
];

export default function RoofPage() {
  const { zones, inputs, buildings, setInputValue, updateZone, updateZoneCheckbox, calculateTotal, volumes } =
    useActStore();

  const roofZones = zones.filter((z) => z.type === "roof");
  const overZones = zones.filter((z) => z.type === "over");

  const getSubtotal = () => {
    let sub = 0;
    const keys = ["1", "2", "3", "4", "5", "16", "17", "18", "19"];
    keys.forEach((k) => {
      if (volumes[k] && DB[k]) sub += volumes[k] * DB[k];
    });
    return sub;
  };

  const handleAddZone = (type: string) => {
    useActStore.setState((state) => {
      const typeZones = state.zones.filter((z) => z.type === type);
      const nextId = typeZones.length > 0 ? Math.max(...typeZones.map((z) => z.id)) + 1 : 1;
      return {
        zones: [
          ...state.zones,
          {
            id: nextId,
            type,
            bld: "",
            name: "",
            desc: "",
            qty: 1,
            l: 0,
            w: 0,
            res: 0,
            cbs: {},
          },
        ],
      };
    });
    calculateTotal();
  };

  const handleRemoveZone = (id: number, type: string) => {
    useActStore.setState((state) => ({
      zones: state.zones.filter((z) => !(z.id === id && z.type === type)),
    }));
    calculateTotal();
  };

  const renderZone = (zone: any, title: string, cbsList: any[]) => (
    <div key={`${zone.type}-${zone.id}`} className="p-5 bg-secondary/30 border border-border rounded-xl space-y-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3 w-full max-w-xl">
          <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded shrink-0">
            {title} №{zone.id}
          </span>
          <Select value={zone.bld || ""} onValueChange={(val) => updateZone(zone.id, zone.type, "bld", val)}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="(Без літери)" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom">
              <SelectItem value="no_bld">(Без літери / Квартира)</SelectItem>
              {buildings
                .filter((b) => b.name)
                .map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Назва зони пошкодження"
            value={zone.name}
            onChange={(e) => updateZone(zone.id, zone.type, "name", e.target.value)}
            className="flex-1 bg-background"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0 shrink-0"
          onClick={() => handleRemoveZone(zone.id, zone.type)}
        >
          <Trash2 size={18} />
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-background p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">К-сть:</Label>
          <Input
            type="number"
            value={zone.qty || ""}
            onChange={(e) => updateZone(zone.id, zone.type, "qty", parseFloat(e.target.value))}
            className="w-16 h-8"
          />
        </div>
        <span className="text-muted-foreground/50">|</span>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Д:</Label>
          <Input
            type="number"
            value={zone.l || ""}
            onChange={(e) => updateZone(zone.id, zone.type, "l", parseFloat(e.target.value))}
            className="w-20 h-8"
          />
        </div>
        <span className="text-muted-foreground/50">×</span>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Ш:</Label>
          <Input
            type="number"
            value={zone.w || ""}
            onChange={(e) => updateZone(zone.id, zone.type, "w", parseFloat(e.target.value))}
            className="w-20 h-8"
          />
        </div>
        <span className="text-muted-foreground/50">=</span>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold uppercase text-primary">Площа:</Label>
          <Input
            type="number"
            value={zone.res || ""}
            readOnly
            className="w-24 h-8 font-bold text-primary border-primary/50 bg-primary/5"
          />
          <span className="text-xs text-muted-foreground">м²</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cbsList.map((cb) => (
          <Label
            key={cb.id}
            className="flex items-start gap-3 p-3 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Checkbox
              checked={!!(zone.cbs && zone.cbs[cb.id])}
              onCheckedChange={(checked) => updateZoneCheckbox(zone.id, zone.type, cb.id, checked as boolean)}
              className="mt-0.5"
            />
            <span className="text-sm font-medium leading-tight select-none">{cb.label}</span>
          </Label>
        ))}
      </div>

      <Input
        type="text"
        placeholder="Опис пошкодження для Акта..."
        value={zone.desc || ""}
        onChange={(e) => updateZone(zone.id, zone.type, "desc", e.target.value)}
        className="w-full bg-background"
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {getSubtotal() > 0 && (
        <div className="bg-greenDim border border-green/20 p-4 rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-sm font-bold text-foreground">Підсумок по розділу:</span>
          <span className="text-lg font-black text-green">
            {getSubtotal().toLocaleString("uk-UA", { minimumFractionDigits: 2 })} грн
          </span>
        </div>
      )}

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Warehouse size={18} className="text-primary" /> Дах / Покрівля
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {roofZones.map((z) => renderZone(z, "Дах", ROOF_CBS))}
          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-12"
            onClick={() => handleAddZone("roof")}
          >
            <Plus size={18} className="mr-2" /> Додати зону (Дах)
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold">Крокви (Погонні метри)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-secondary/30 border border-border rounded-xl">
            <Label className="flex-1 text-sm font-medium">п.2. Заміна кроквяних ніг із брусів</Label>
            <Input
              type="number"
              className="w-24 bg-background"
              value={inputs.si_2 || ""}
              onChange={(e) => setInputValue("si_2", parseFloat(e.target.value))}
            />
          </div>
          <Input
            type="text"
            placeholder="Опис пошкодження крокв для Акта..."
            value={inputs.desc_roof_manual || ""}
            onChange={(e) => setInputValue("desc_roof_manual", e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Warehouse size={18} className="text-primary" /> Перекриття
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {overZones.map((z) => renderZone(z, "Перекриття", OVER_CBS))}
          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-12"
            onClick={() => handleAddZone("over")}
          >
            <Plus size={18} className="mr-2" /> Додати зону (Перекриття)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
