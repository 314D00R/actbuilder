"use client";

import { useState, useEffect } from "react";
import { useActStore } from "@/store/useActStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building, Plus, Trash2, Ruler } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPT_FND = ["-", "Залізобетонні", "Бетонні", "Палі", "Монолітні", "Бутові"];
const OPT_WALL = ["-", "цегла", "черепашник", "газобетон", "металеві", "дерев'яні", "бутові", "панельні", "блоки"];
const OPT_IN_WALL = [
  "-",
  "цегла",
  "черепашник",
  "газобетон",
  "металеві",
  "дерев'яні",
  "панельні",
  "гіпсокартон",
  "шпалери",
  "оштукатурені, пофарбовані",
];
const OPT_OVER = ["-", "з/б плити", "монолітні", "дерев'яні"];
const OPT_COVER = ["-", "цементна стяжка", "плитка", "дорожні плити"];
const OPT_ROOF = ["-", "рулонна", "бітумна черепиця", "металочерепиця", "металопрофіль", "шифер"];
const OPT_WIN = ["-", "дерев'яні", "металопластикові", "металеві"];
const OPT_DOOR = ["-", "дерев'яні", "металопластикові", "металеві"];
const OPT_FAC = ["-", "оштукатурені, пофарбовані", "цегла", "утеплені пенопластом", "утеплені мін. ватою"];
const OPT_FLR = ["-", "лінолеум", "плитка", "цементна стяжка", "ламінат", "паркет", "дощаті"];
const OPT_CEIL = ["-", "гіпсокартон", "підвісна", "оштукатурені, пофарбовані", "шпалери"];
const OPT_YN = ["-", "так", "ні"];

function SmartSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (value && value !== "-" && !options.includes(value)) {
      setIsCustom(true);
    } else if (options.includes(value) || value === "-") {
      setIsCustom(false);
    }
  }, [value, options]);

  if (isCustom) {
    return (
      <div className="space-y-2 w-full">
        <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
        <div className="flex gap-2 w-full">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Впишіть значення..."
            className="w-full flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsCustom(false);
              onChange("-");
            }}
          >
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Select
        value={value || "-"}
        onValueChange={(val) => {
          if (val === "custom") {
            setIsCustom(true);
            onChange("");
          } else {
            setIsCustom(false);
            onChange(val);
          }
        }}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" className="max-h-[300px]">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value="custom" className="text-primary font-bold">
            ✏ Вписати свій...
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function TechpassPage() {
  const { inputs, setInputValue, buildings, calculateTotal } = useActStore();

  const handleAddBuilding = () => {
    useActStore.setState((state) => {
      const nextId = state.buildings.length > 0 ? Math.max(...state.buildings.map((b) => b.id)) + 1 : 1;
      return {
        buildings: [
          ...state.buildings,
          {
            id: nextId,
            name: "",
            fnd: "-",
            wall: "-",
            in_wall: "-",
            over1: "-",
            overm: "-",
            overa: "-",
            cover: "-",
            roof: "-",
            win: "-",
            door: "-",
            fac: "-",
            flr: "-",
            ceil: "-",
            el: "-",
            w: "-",
            g: "-",
            kan: "-",
            op: "-",
          },
        ],
      };
    });
    calculateTotal();
  };

  const handleRemoveBuilding = (id: number) => {
    useActStore.setState((state) => ({
      buildings: state.buildings.filter((b) => b.id !== id),
    }));
    calculateTotal();
  };

  const handleUpdateBuilding = (id: number, field: string, value: string) => {
    useActStore.setState((state) => ({
      buildings: state.buildings.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
    calculateTotal();
  };

  useEffect(() => {
    if (useActStore.getState().buildings.length === 0) {
      handleAddBuilding();
    }
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. ЗАГАЛЬНІ ХАРАКТЕРИСТИКИ */}
      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Ruler size={18} className="text-primary" /> Загальні характеристики
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">Пам'ятка спадщини</Label>
              <Input
                type="text"
                value={inputs.heritage_info !== undefined ? inputs.heritage_info : "відсутні"}
                onChange={(e) => setInputValue("heritage_info", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Рік будівництва</Label>
              <Input
                type="text"
                placeholder="1990"
                value={inputs.year_built || ""}
                onChange={(e) => setInputValue("year_built", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Заг. площа, м²</Label>
              <Input
                type="text"
                placeholder="100"
                value={inputs.total_area || ""}
                onChange={(e) => setInputValue("total_area", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Поверхів (загалом)</Label>
              <Input
                type="text"
                value={inputs.floors_total !== undefined ? inputs.floors_total : "1"}
                onChange={(e) => setInputValue("floors_total", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Наземних</Label>
              <Input
                type="text"
                placeholder="1"
                value={inputs.floors_over || ""}
                onChange={(e) => setInputValue("floors_over", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Підземних</Label>
              <Input
                type="text"
                value={inputs.floors_under !== undefined ? inputs.floors_under : "відсутні"}
                onChange={(e) => setInputValue("floors_under", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Мансардних</Label>
              <Input
                type="text"
                value={inputs.mansard !== undefined ? inputs.mansard : "відсутні"}
                onChange={(e) => setInputValue("mansard", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Секцій</Label>
              <Input
                type="text"
                value={inputs.sections !== undefined ? inputs.sections : "відсутні"}
                onChange={(e) => setInputValue("sections", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Квартир</Label>
              <Input
                type="text"
                value={inputs.apartments !== undefined ? inputs.apartments : "відсутні"}
                onChange={(e) => setInputValue("apartments", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-3">
              <Label className="text-xs uppercase text-muted-foreground">Правовстановлюючі документи</Label>
              <Input
                type="text"
                placeholder="Технічний паспорт ...; Витяг з реєстру..."
                value={inputs.legal_docs || ""}
                onChange={(e) => setInputValue("legal_docs", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Нежитлових, м²</Label>
              <Input
                type="text"
                value={inputs.built_in_area !== undefined ? inputs.built_in_area : "0"}
                onChange={(e) => setInputValue("built_in_area", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. КОНСТРУКТИВНІ ЕЛЕМЕНТИ (БЛОКИ БУДІВЕЛЬ) */}
      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building size={18} className="text-primary" /> Конструктивні елементи (по будівлях / літерах)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {buildings.map((bld) => (
            <div key={bld.id} className="p-5 bg-secondary/30 border border-border rounded-xl space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded shrink-0">
                    Будівля №{bld.id}
                  </span>
                  <Input
                    type="text"
                    placeholder="Літера (напр. Літ. 2Х)"
                    className="h-9 text-sm font-bold bg-background w-full"
                    value={bld.name || ""}
                    onChange={(e) => handleUpdateBuilding(bld.id, "name", e.target.value)}
                  />
                </div>
                {buildings.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
                    onClick={() => handleRemoveBuilding(bld.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>

              {/* Ряд 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <SmartSelect
                  label="Фундаменти"
                  value={bld.fnd}
                  options={OPT_FND}
                  onChange={(v) => handleUpdateBuilding(bld.id, "fnd", v)}
                />
                <SmartSelect
                  label="Стіни зовнішні"
                  value={bld.wall}
                  options={OPT_WALL}
                  onChange={(v) => handleUpdateBuilding(bld.id, "wall", v)}
                />
                <SmartSelect
                  label="Стіни внутрішні"
                  value={bld.in_wall}
                  options={OPT_IN_WALL}
                  onChange={(v) => handleUpdateBuilding(bld.id, "in_wall", v)}
                />
              </div>

              {/* Ряд 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <SmartSelect
                  label="Перекриття (1 пов.)"
                  value={bld.over1}
                  options={OPT_OVER}
                  onChange={(v) => handleUpdateBuilding(bld.id, "over1", v)}
                />
                <SmartSelect
                  label="Перекриття (Міжпов.)"
                  value={bld.overm}
                  options={OPT_OVER}
                  onChange={(v) => handleUpdateBuilding(bld.id, "overm", v)}
                />
                <SmartSelect
                  label="Перекриття (Горище)"
                  value={bld.overa}
                  options={OPT_OVER}
                  onChange={(v) => handleUpdateBuilding(bld.id, "overa", v)}
                />
              </div>

              {/* Ряд 3 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                <SmartSelect
                  label="Покриття"
                  value={bld.cover}
                  options={OPT_COVER}
                  onChange={(v) => handleUpdateBuilding(bld.id, "cover", v)}
                />
                <SmartSelect
                  label="Покрівлі"
                  value={bld.roof}
                  options={OPT_ROOF}
                  onChange={(v) => handleUpdateBuilding(bld.id, "roof", v)}
                />
                <SmartSelect
                  label="Вікна"
                  value={bld.win}
                  options={OPT_WIN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "win", v)}
                />
                <SmartSelect
                  label="Двері вхідні"
                  value={bld.door}
                  options={OPT_DOOR}
                  onChange={(v) => handleUpdateBuilding(bld.id, "door", v)}
                />
              </div>

              {/* Ряд 4 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <SmartSelect
                  label="Фасад"
                  value={bld.fac}
                  options={OPT_FAC}
                  onChange={(v) => handleUpdateBuilding(bld.id, "fac", v)}
                />
                <SmartSelect
                  label="Підлоги"
                  value={bld.flr}
                  options={OPT_FLR}
                  onChange={(v) => handleUpdateBuilding(bld.id, "flr", v)}
                />
                <SmartSelect
                  label="Стеля"
                  value={bld.ceil}
                  options={OPT_CEIL}
                  onChange={(v) => handleUpdateBuilding(bld.id, "ceil", v)}
                />
              </div>

              {/* Інженерія */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 mt-4 bg-background border border-border rounded-lg shadow-inner w-full">
                <SmartSelect
                  label="Електро"
                  value={bld.el}
                  options={OPT_YN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "el", v)}
                />
                <SmartSelect
                  label="Водопостач."
                  value={bld.w}
                  options={OPT_YN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "w", v)}
                />
                <SmartSelect
                  label="Газ"
                  value={bld.g}
                  options={OPT_YN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "g", v)}
                />
                <SmartSelect
                  label="Каналізація"
                  value={bld.kan}
                  options={OPT_YN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "kan", v)}
                />
                <SmartSelect
                  label="Опалення"
                  value={bld.op}
                  options={OPT_YN}
                  onChange={(v) => handleUpdateBuilding(bld.id, "op", v)}
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-12"
            onClick={handleAddBuilding}
          >
            <Plus size={18} className="mr-2" /> Додати будівлю / літеру
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
