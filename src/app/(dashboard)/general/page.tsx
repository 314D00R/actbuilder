"use client";

import { useEffect, useState } from "react";
import { useActStore } from "@/store/useActStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Users, CheckSquare, StickyNote, Plus, Trash2 } from "lucide-react";

export default function GeneralPage() {
  const { inputs, setInputValue, calculateTotal } = useActStore();

  const owners = useActStore((state) => state.owners);

  const [customFields, setCustomFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (owners.length === 0) {
      useActStore.setState({
        owners: [
          {
            id: 1,
            type: "власник",
            name: "",
            doc: "",
            org: "Іллічівським МВ ГУМВС України в Одеській обл.",
            pass_date: "",
            rnokpp: "",
          },
        ],
      });
    }
  }, [owners]);

  const updateOwnerField = (id: number, field: string, value: string) => {
    useActStore.setState((state) => ({
      owners: state.owners.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    }));
    calculateTotal();
  };

  const handleAddOwner = () => {
    const nextId = owners.length > 0 ? Math.max(...owners.map((o) => o.id)) + 1 : 1;
    useActStore.setState((state) => ({
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
    }));
    calculateTotal();
  };

  const handleRemoveOwner = (id: number) => {
    useActStore.setState((state) => ({
      owners: state.owners.filter((o) => o.id !== id),
    }));
    calculateTotal();
  };

  const handleSelectChange = (id: string, value: string) => {
    if (value === "custom") {
      setCustomFields((prev) => ({ ...prev, [id]: true }));
      setInputValue(id, "");
    } else {
      setCustomFields((prev) => ({ ...prev, [id]: false }));
      setInputValue(id, value);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm">
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
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs uppercase text-muted-foreground">Тип об&apos;єкта (для Чеклиста)</Label>
            {!customFields.object_type ? (
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                value={inputs.object_type || ""}
                onChange={(e) => handleSelectChange("object_type", e.target.value)}
              >
                <option value="квартира в багатоквартирному житловому будинку, 1122.1">
                  квартира в багатоквартирному житловому будинку, 1122.1
                </option>
                <option value="квартира в будинку підвищеної комфортності, 1122.2">
                  квартира в будинку підвищеної комфортності, 1122.2
                </option>
                <option value="будинок садибного типу, 1110.3">будинок садибного типу, 1110.3</option>
                <option value="будинок дачний або садовий, 1110.4">будинок дачний або садовий, 1110.4</option>
                <option value="будівля органів державного та місцевого управління, 1220.1">
                  будівля органів державного та місцевого управління, 1220.1
                </option>
                <option value="custom">✏ Вписати свій варіант...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Введіть тип об'єкта вручну..."
                  value={inputs.object_type || ""}
                  onChange={(e) => setInputValue("object_type", e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomFields((prev) => ({ ...prev, object_type: false }))}
                >
                  Скасувати
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Адреса об&apos;єкта
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Місто / Село</Label>
              {!customFields.addr_city ? (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
                  value={inputs.addr_city || ""}
                  onChange={(e) => handleSelectChange("addr_city", e.target.value)}
                >
                  <option value="m. Chornomorsk">м. Чорноморськ</option>
                  <option value="сел. Олександрівка">сел. Олександрівка</option>
                  <option value="с. Малодолинське">с. Малодолинське</option>
                  <option value="с. Бурлача Балка">с. Бурлача Балка</option>
                  <option value="custom">✏ Вписати своє...</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Назва НП..."
                    value={inputs.addr_city || ""}
                    onChange={(e) => setInputValue("addr_city", e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomFields((prev) => ({ ...prev, addr_city: false }))}
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Тип вул.</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
                value={inputs.addr_str_type || ""}
                onChange={(e) => setInputValue("addr_str_type", e.target.value)}
              >
                <option value="вул. ">вул.</option>
                <option value="просп. ">просп.</option>
                <option value="пров. ">пров.</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Назва вулиці</Label>
              <Input
                type="text"
                placeholder="Парусна"
                value={inputs.addr_street || ""}
                onChange={(e) => setInputValue("addr_street", e.target.value)}
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
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Квартира</Label>
              <Input
                type="text"
                placeholder="-"
                value={inputs.addr_apt || ""}
                onChange={(e) => setInputValue("addr_apt", e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">Форма власності</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
                value={inputs.ownership_type || ""}
                onChange={(e) => setInputValue("ownership_type", e.target.value)}
              >
                <option value="приватна">приватна</option>
                <option value="державна">державна</option>
                <option value="комунальна">комунальна</option>
              </select>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">Кадастровий номер</Label>
              <Input
                type="text"
                placeholder="-"
                value={inputs.cadastral || ""}
                onChange={(e) => setInputValue("cadastral", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users size={18} className="text-primary" /> Власники / Управителі
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {owners.map((owner, index) => (
            <div key={owner.id} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-4 relative">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3 w-full max-w-md">
                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                    Власник №{index + 1}
                  </span>
                  <select
                    className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm text-foreground focus-visible:outline-none"
                    value={owner.type}
                    onChange={(e) => updateOwnerField(owner.id, "type", e.target.value)}
                  >
                    <option value="власник">Власник (Фіз)</option>
                    <option value="співвласник">Співвласник (Фіз)</option>
                    <option value="управитель">Управитель (Фіз)</option>
                    <option value="юридична особа">Юридична особа</option>
                  </select>
                </div>
                {owners.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    onClick={() => handleRemoveOwner(owner.id)}
                  >
                    <Trash2 size={16} />
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
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs uppercase text-muted-foreground">Ким виданий</Label>
                  <Input
                    type="text"
                    value={owner.org}
                    onChange={(e) => updateOwnerField(owner.id, "org", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Дата видачі / РНОКПП</Label>
                  <Input
                    type="text"
                    placeholder="12.12.2012"
                    value={owner.pass_date}
                    onChange={(e) => updateOwnerField(owner.id, "pass_date", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-11"
            onClick={handleAddOwner}
          >
            <Plus size={16} className="mr-2" /> Додати власника / управителя
          </Button>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">У присутності</Label>
              <Input
                type="text"
                placeholder="Іванова Івана Івановича"
                value={inputs.present_manual || ""}
                onChange={(e) => setInputValue("present_manual", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">На підставі заяви</Label>
              <Input
                type="text"
                placeholder="Іванова Івана Івановича від 13.02.2026 №123"
                value={inputs.zayava_info || ""}
                onChange={(e) => setInputValue("zayava_info", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CheckSquare size={18} className="text-muted-foreground" /> Критерії оцінки (Чеклист)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Пріоритетне право?</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
              value={inputs.q_1 || "ні"}
              onChange={(e) => setInputValue("q_1", e.target.value)}
            >
              <option value="ні">ні</option>
              <option value="так">так</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Проведено ремонт?</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
              value={inputs.q_2 || "ні"}
              onChange={(e) => setInputValue("q_2", e.target.value)}
            >
              <option value="ні">ні</option>
              <option value="так">так</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Вплив на несучу здатність?</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none"
              value={inputs.q_3 || "ні"}
              onChange={(e) => setInputValue("q_3", e.target.value)}
            >
              <option value="ні">ні</option>
              <option value="так">так</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm">
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
