import { useState, useEffect } from "react";
import { CATEGORY_ORDER, type Item } from "../types";

export type ItemFormValues = {
  name: string;
  unit: string;
  unitPrice: string;
  category: string;
  subcategory: string;
  code: string;
};

export function emptyItemForm(category?: string): ItemFormValues {
  return {
    name: "",
    unit: "each",
    unitPrice: "0",
    category: category ?? CATEGORY_ORDER[0],
    subcategory: "",
    code: "",
  };
}

export function itemToFormValues(item: Item): ItemFormValues {
  return {
    name: item.name,
    unit: item.unit,
    unitPrice: String(item.unitPrice),
    category: item.category,
    subcategory: item.subcategory ?? "",
    code: item.code ?? "",
  };
}

export function formValuesToItem(
  values: ItemFormValues,
  base: Pick<Item, "id" | "sortOrder" | "archived">,
): Item {
  return {
    id: base.id,
    name: values.name.trim(),
    unit: values.unit.trim() || "each",
    unitPrice: Math.max(0, Number(values.unitPrice) || 0),
    category: values.category,
    subcategory: values.subcategory.trim() || undefined,
    code: values.code.trim() || undefined,
    sortOrder: base.sortOrder,
    archived: base.archived,
  };
}

export function ItemForm({
  values,
  onChange,
  knownSubcategories,
}: {
  values: ItemFormValues;
  onChange: (next: ItemFormValues) => void;
  knownSubcategories: Record<string, string[]>;
}) {
  const [subSuggestions, setSubSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setSubSuggestions(knownSubcategories[values.category] ?? []);
  }, [values.category, knownSubcategories]);

  const set = <K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) =>
    onChange({ ...values, [k]: v });

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          type="text"
          autoFocus
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          className="input"
          placeholder="e.g. Bananas CSL"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit">
          <input
            type="text"
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
            className="input"
            placeholder="e.g. 1kg, each, box"
          />
        </Field>
        <Field label="Unit price (£)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.unitPrice}
            onChange={(e) => set("unitPrice", e.target.value)}
            className="input"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            className="input"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subcategory (optional)">
          <input
            type="text"
            value={values.subcategory}
            onChange={(e) => set("subcategory", e.target.value)}
            list="subcategory-suggestions"
            className="input"
            placeholder="e.g. Pasta & Rice"
          />
          <datalist id="subcategory-suggestions">
            {subSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Code (optional)">
        <input
          type="text"
          value={values.code}
          onChange={(e) => set("code", e.target.value)}
          className="input"
          placeholder="Supplier or stock code"
        />
      </Field>
      <style>{`
        .input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(199 216 205);
          background: white;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .input:focus {
          border-color: rgb(58 96 79);
          box-shadow: 0 0 0 3px rgb(199 216 205 / 0.5);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-brand-800 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
