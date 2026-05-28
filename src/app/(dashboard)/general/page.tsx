"use client";

import { useEffect, useState } from "react";
import { useActStore } from "@/store/useActStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Users, CheckSquare, StickyNote, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Словники
const OPT_OBJ_TYPE = [
  "квартира в багатоквартирному житловому будинку, 1122.1",
  "квартира в будинку підвищеної комфортності, 1122.2",
  "будинок садибного типу, 1110.3",
  "будинок дачний або садовий, 1110.4",
  "будівля органів державного та місцевого управління, 1220.1",
  "адміністративно-побутова будівля промислового підприємства, 1220.5",
  "будівля для конторських та адміністративних цілей інша, 1220.9",
  "гуртожиток для робітників та службовців, 1130.1",
  "портова споруда морська, 2151.1",
];
const OPT_CITY = ["м. Чорноморськ", "сел. Олександрівка", "с. Малодолинське", "с. Бурлача Балка"];
const OPT_STR_TYPE = ["вул. ", "просп. ", "пров. "];
const OPT_OWNERSHIP = ["приватна", "державна", "комунальна"];
const OPT_OWNER_TYPE = ["власник", "співвласник", "управитель", "юридична особа"];

function SmartSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  className?: string;
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
      <div className={`space-y-2 w-full ${className || ""}`}>
        {label && <Label className="text-xs uppercase text-muted-foreground">{label}</Label>}
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
              onChange(options[0] || "");
            }}
          >
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 w-full ${className || ""}`}>
      {label && <Label className="text-xs uppercase text-muted-foreground">{label}</Label>}
      <Select
        value={value || ""}
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
          <SelectValue placeholder="Оберіть..." />
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

export default function GeneralPage() {
  const { inputs, setInputValue, calculateTotal } = useActStore();
  const owners = useActStore((state) => state.owners);

  useEffect(() => {
    if (useActStore.getState().owners.length === 0) {
      handleAddOwner();
    }
  }, []);

  const handleAddOwner = () => {
    useActStore.setState((state) => {
      const nextId = state.owners.length > 0 ? Math.max(...state.owners.map((o) => o.id)) + 1 : 1;
      return {
        owners: [
          ...state.owners,
          {
            id: nextId,
            type: "власник",
            name: "",
            doc: "",
            org: "Іллічівським МВ ГУМВС України в Одеській обл.",
            pass_date: "",
            rnokpp: "",
          },
        ],
      };
    });
    calculateTotal();
  };

  const updateOwnerField = (id: number, field: string, value: string) => {
    useActStore.setState((state) => ({
      owners: state.owners.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    }));
    calculateTotal();
  };

  const handleRemoveOwner = (id: number) => {
    useActStore.setState((state) => ({
      owners: state.owners.filter((o) => o.id !== id),
    }));
    calculateTotal();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Основа документа
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Дата Акта</Label>
            <Input
              type="text"
              placeholder="ДД.ММ.РРРР"
              value={inputs.act_date || ""}
              onChange={(e) => setInputValue("act_date", e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <SmartSelect
              label="Тип об'єкта (для Чеклиста)"
              value={inputs.object_type || ""}
              options={OPT_OBJ_TYPE}
              onChange={(v) => setInputValue("object_type", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Адреса об'єкта
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SmartSelect
              label="Місто / Село"
              value={inputs.addr_city || ""}
              options={OPT_CITY}
              onChange={(v) => setInputValue("addr_city", v)}
            />
            <SmartSelect
              label="Тип вул."
              value={inputs.addr_str_type || ""}
              options={OPT_STR_TYPE}
              onChange={(v) => setInputValue("addr_str_type", v)}
            />
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Назва вулиці</Label>
              <Input
                type="text"
                placeholder="Парусна"
                value={inputs.addr_street || ""}
                onChange={(e) => setInputValue("addr_street", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Будинок</Label>
              <Input
                type="text"
                placeholder="12"
                value={inputs.addr_house || ""}
                onChange={(e) => setInputValue("addr_house", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Квартира</Label>
              <Input
                type="text"
                placeholder="-"
                value={inputs.addr_apt || ""}
                onChange={(e) => setInputValue("addr_apt", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <SmartSelect
                label="Форма власності"
                value={inputs.ownership_type || ""}
                options={OPT_OWNERSHIP}
                onChange={(v) => setInputValue("ownership_type", v)}
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">Кадастровий номер</Label>
              <Input
                type="text"
                placeholder="-"
                value={inputs.cadastral || ""}
                onChange={(e) => setInputValue("cadastral", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users size={18} className="text-primary" /> Власники / Управителі
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {owners.map((owner, index) => (
            <div key={owner.id} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded shrink-0">
                    Власник №{index + 1}
                  </span>
                  <SmartSelect
                    value={owner.type}
                    options={OPT_OWNER_TYPE}
                    onChange={(v) => updateOwnerField(owner.id, "type", v)}
                    className="flex-1 space-y-0"
                  />
                </div>
                {owners.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0 shrink-0"
                    onClick={() => handleRemoveOwner(owner.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">ПІБ / Назва компанії</Label>
                <Input
                  type="text"
                  placeholder="Іванов Іван Іванович"
                  value={owner.name}
                  onChange={(e) => updateOwnerField(owner.id, "name", e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Паспорт / ЄДРПОУ</Label>
                  <Input
                    type="text"
                    placeholder="СЕ 123456"
                    value={owner.doc}
                    onChange={(e) => updateOwnerField(owner.id, "doc", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs uppercase text-muted-foreground">Ким виданий</Label>
                  <Input
                    type="text"
                    value={owner.org}
                    onChange={(e) => updateOwnerField(owner.id, "org", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Дата видачі / РНОКПП</Label>
                  <Input
                    type="text"
                    placeholder="12.12.2012"
                    value={owner.pass_date}
                    onChange={(e) => updateOwnerField(owner.id, "pass_date", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-12"
            onClick={handleAddOwner}
          >
            <Plus size={18} className="mr-2" /> Додати власника / управителя
          </Button>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">У присутності</Label>
              <Input
                type="text"
                placeholder="Іванова Івана Івановича"
                value={inputs.present_manual || ""}
                onChange={(e) => setInputValue("present_manual", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">На підставі заяви</Label>
              <Input
                type="text"
                placeholder="Іванова Івана Івановича від 13.02.2026 №123"
                value={inputs.zayava_info || ""}
                onChange={(e) => setInputValue("zayava_info", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CheckSquare size={18} className="text-muted-foreground" /> Критерії оцінки (Чеклист)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 w-full">
            <Label className="text-xs uppercase text-muted-foreground">Пріоритетне право?</Label>
            <Select value={inputs.q_1 || "ні"} onValueChange={(val) => setInputValue("q_1", val)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom">
                <SelectItem value="ні">ні</SelectItem>
                <SelectItem value="так">так</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full">
            <Label className="text-xs uppercase text-muted-foreground">Проведено ремонт?</Label>
            <Select value={inputs.q_2 || "ні"} onValueChange={(val) => setInputValue("q_2", val)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom">
                <SelectItem value="ні">ні</SelectItem>
                <SelectItem value="так">так</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full">
            <Label className="text-xs uppercase text-muted-foreground">Вплив на несучу здатність?</Label>
            <Select value={inputs.q_3 || "ні"} onValueChange={(val) => setInputValue("q_3", val)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom">
                <SelectItem value="ні">ні</SelectItem>
                <SelectItem value="так">так</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <StickyNote size={18} className="text-muted-foreground" /> Службові нотатки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Внутрішні нотатки (не потрапляють в підсумковий документ)..."
            value={inputs.obj_notes || ""}
            onChange={(e) => setInputValue("obj_notes", e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}
