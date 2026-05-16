import { describe, it, expect } from "vitest";
import { formatCurrency, initials } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formatta importi positivi con simbolo Euro e decimali", () => {
    const out = formatCurrency(1234.56);
    expect(out).toContain("€");
    expect(out).toContain("56"); // decimali presenti
  });

  it("mostra trattino per null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("omette decimali quando interi", () => {
    expect(formatCurrency(100)).not.toMatch(/,00/);
  });
});

describe("initials", () => {
  it("prende le iniziali di nome e cognome in maiuscolo", () => {
    expect(initials("Mario Rossi")).toBe("MR");
  });

  it("gestisce un solo nome", () => {
    expect(initials("Mario")).toBe("M");
  });

  it("limita a 2 caratteri anche con più nomi", () => {
    expect(initials("Anna Maria Bianchi")).toBe("AM");
  });

  it("ignora spazi multipli", () => {
    expect(initials("  Mario   Rossi  ").length).toBeLessThanOrEqual(2);
  });
});
