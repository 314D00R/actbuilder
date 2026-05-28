import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DB } from "@/lib/constants";

interface WindowData {
  id: number;
  bld: string;
  name: string;
  desc: string;
  qty: number;
  type: string;
  sType: string;
  w: number;
  h: number;
  d: number;
  res_w: number;
  res_s: number;
}

interface ZoneData {
  id: number;
  type: string; // roof, wall, floor, etc.
  bld: string;
  name: string;
  desc: string;
  qty: number;
  l: number;
  w: number;
  res: number;
  cbs: Record<string, boolean>;
  wallSide?: string;
}

interface EngData {
  id: number;
  bld: string;
  name: string;
  desc: string;
  [key: string]: any;
}

interface ActState {
  inputs: Record<string, any>;
  windows: WindowData[];
  zones: ZoneData[];
  buildings: any[];
  owners: any[];
  eng: EngData[];

  volumes: Record<string, number>;
  totalSum: number;

  setInputValue: (id: string, value: any) => void;
  updateWindow: (id: number, field: keyof WindowData, value: any) => void;
  updateZone: (id: number, type: string, field: keyof ZoneData, value: any) => void;
  updateZoneCheckbox: (id: number, type: string, cbKey: string, isChecked: boolean) => void;
  calculateTotal: () => void;
  resetForm: () => void;
}

export const useActStore = create<ActState>()(
  persist(
    (set, get) => ({
      inputs: {},
      windows: [],
      zones: [],
      buildings: [],
      owners: [],
      eng: [],
      volumes: {},
      totalSum: 0,

      setInputValue: (id, value) => {
        set((state) => ({ inputs: { ...state.inputs, [id]: value } }));
        get().calculateTotal();
      },

      updateWindow: (id, field, value) => {
        set((state) => ({
          windows: state.windows.map((win) => {
            if (win.id !== id) return win;
            const updatedWin = { ...win, [field]: value };

            if (["w", "h", "qty", "d"].includes(field)) {
              const w = Number(updatedWin.w) || 0;
              const h = Number(updatedWin.h) || 0;
              const qty = Number(updatedWin.qty) || 1;
              const d = Number(updatedWin.d) || 0;
              if (w > 0 && h > 0) {
                updatedWin.res_w = Number((w * h * qty).toFixed(2));
                updatedWin.res_s = Number(((2 * h + w) * d * qty).toFixed(2));
              }
            }
            return updatedWin;
          }),
        }));
        get().calculateTotal();
      },

      updateZone: (id, type, field, value) => {
        set((state) => ({
          zones: state.zones.map((zone) => {
            if (zone.id !== id || zone.type !== type) return zone;
            const updatedZone = { ...zone, [field]: value };

            if (["l", "w", "qty"].includes(field)) {
              const l = Number(updatedZone.l) || 0;
              const w = Number(updatedZone.w) || 0;
              const qty = Number(updatedZone.qty) || 1;
              if (l > 0 && w > 0) {
                updatedZone.res = Number((l * w * qty).toFixed(2));
              }
            }
            return updatedZone;
          }),
        }));
        get().calculateTotal();
      },

      updateZoneCheckbox: (id, type, cbKey, isChecked) => {
        set((state) => ({
          zones: state.zones.map((zone) => {
            if (zone.id !== id || zone.type !== type) return zone;
            return { ...zone, cbs: { ...zone.cbs, [cbKey]: isChecked } };
          }),
        }));
        get().calculateTotal();
      },

      calculateTotal: () => {
        const state = get();
        const newVolumes: Record<string, number> = {};
        let newTotal = 0;

        state.windows.forEach((win) => {
          const qty = Number(win.qty) || 1;
          const resW = Number(win.res_w) || 0;
          const resS = Number(win.res_s) || 0;

          if (win.type === "door_in_6") newVolumes["6"] = (newVolumes["6"] || 0) + qty;
          else if (win.type === "door_out_7") newVolumes["7"] = (newVolumes["7"] || 0) + qty;
          else if (win.type === "frame") {
            newVolumes["9"] = (newVolumes["9"] || 0) + resW;
            if (win.sType) newVolumes[win.sType] = (newVolumes[win.sType] || 0) + resS;
          } else if (win.type === "door_mp") newVolumes["9"] = (newVolumes["9"] || 0) + resW;
          else newVolumes["8"] = (newVolumes["8"] || 0) + resW;
        });

        state.zones.forEach((zone) => {
          const area = Number(zone.res) || 0;
          if (area > 0 && zone.cbs) {
            Object.entries(zone.cbs).forEach(([key, isChecked]) => {
              if (isChecked) {
                newVolumes[key] = (newVolumes[key] || 0) + area;
              }
            });
          }
        });

        state.eng.forEach((engItem) => {
          const keys = [
            "46_1",
            "46_2",
            "46_3",
            "46_4",
            "46_5",
            "47",
            "48",
            "49",
            "50",
            "51",
            "52",
            "53",
            "54",
            "55",
            "56",
            "57",
            "58",
            "59",
          ];
          keys.forEach((k) => {
            const val = Number(engItem[k]) || 0;
            if (val > 0) newVolumes[k] = (newVolumes[k] || 0) + val;
          });
        });

        const singleKeys = ["2", "43", "c20", "c21", "c22"];
        singleKeys.forEach((k) => {
          const val = Number(state.inputs[`si_${k}`] || state.inputs[`t_${k}`]) || 0;
          if (val > 0) {
            const actualKey = k.replace("c", ""); // "c20" -> "20"
            newVolumes[actualKey] = (newVolumes[actualKey] || 0) + val;
          }
        });

        for (const [key, vol] of Object.entries(newVolumes)) {
          if (vol > 0 && DB[key]) {
            newTotal += Math.round(vol * DB[key] * 100) / 100;
          }
        }

        set({ volumes: newVolumes, totalSum: newTotal });
      },

      resetForm: () =>
        set({ inputs: {}, windows: [], zones: [], buildings: [], owners: [], eng: [], volumes: {}, totalSum: 0 }),
    }),
    {
      name: "actbuilder-storage",
    },
  ),
);
