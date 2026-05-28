import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SignData {
  id: number;
  role: string;
  name: string;
}

interface StaticState {
  order_no: string;
  order_date: string;
  order_name: string;
  comm_head_nom: string;
  comm_head_gen: string;
  comm_deputy: string;
  comm_sec: string;
  comm_members: string;
  signs: SignData[];

  setField: (field: string, value: string) => void;
  addSign: () => void;
  updateSign: (id: number, field: keyof SignData, value: string) => void;
  removeSign: (id: number) => void;
}

export const useStaticStore = create<StaticState>()(
  persist(
    (set) => ({
      order_no: "",
      order_date: "",
      order_name: "",
      comm_head_nom: "",
      comm_head_gen: "",
      comm_deputy: "",
      comm_sec: "",
      comm_members: "",
      signs: [],

      setField: (field, value) => set({ [field]: value }),

      addSign: () =>
        set((state) => {
          const nextId = state.signs.length > 0 ? Math.max(...state.signs.map((s) => s.id)) + 1 : 1;
          return {
            signs: [...state.signs, { id: nextId, role: "Член комісії", name: "" }],
          };
        }),

      updateSign: (id, field, value) =>
        set((state) => ({
          signs: state.signs.map((sign) => (sign.id === id ? { ...sign, [field]: value } : sign)),
        })),

      removeSign: (id) =>
        set((state) => ({
          signs: state.signs.filter((sign) => sign.id !== id),
        })),
    }),
    {
      name: "evidnovlennya_static_v14",
    },
  ),
);
