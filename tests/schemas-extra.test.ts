import { describe, it, expect } from "vitest";
import {
  invoiceFormSchema,
  invoiceItemSchema,
  appointmentFormSchema,
  caseFormSchema,
} from "@/lib/schemas";

describe("invoiceItemSchema", () => {
  it("rifiuta quantità < 0.01", () => {
    const r = invoiceItemSchema.safeParse({
      description: "Sostituzione paraurti",
      quantity: 0,
      unit_price: 100,
    });
    expect(r.success).toBe(false);
  });

  it("rifiuta prezzi negativi", () => {
    const r = invoiceItemSchema.safeParse({
      description: "Lavoro",
      quantity: 1,
      unit_price: -50,
    });
    expect(r.success).toBe(false);
  });

  it("rifiuta descrizione vuota", () => {
    const r = invoiceItemSchema.safeParse({
      description: "   ",
      quantity: 1,
      unit_price: 10,
    });
    expect(r.success).toBe(false);
  });
});

describe("invoiceFormSchema", () => {
  it("richiede almeno una riga", () => {
    const r = invoiceFormSchema.safeParse({
      kind: "preventivo",
      status: "bozza",
      issued_at: "2026-05-20",
      due_at: null,
      vat_rate: 22,
      notes: null,
      items: [],
    });
    expect(r.success).toBe(false);
  });

  it("rifiuta IVA > 100", () => {
    const r = invoiceFormSchema.safeParse({
      kind: "fattura",
      status: "bozza",
      issued_at: "2026-05-20",
      due_at: null,
      vat_rate: 150,
      notes: null,
      items: [{ description: "Lavoro", quantity: 1, unit_price: 10 }],
    });
    expect(r.success).toBe(false);
  });

  it("accetta un preventivo valido completo", () => {
    const r = invoiceFormSchema.safeParse({
      kind: "preventivo",
      status: "bozza",
      issued_at: "2026-05-20",
      due_at: "2026-06-20",
      vat_rate: 22,
      notes: "Validità 30 giorni",
      items: [
        { description: "Verniciatura", quantity: 1, unit_price: 800 },
        { description: "Sostituzione paraurti", quantity: 1, unit_price: 350 },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("appointmentFormSchema", () => {
  it("rifiuta ends_at antecedente a starts_at", () => {
    const r = appointmentFormSchema.safeParse({
      title: "Consegna",
      kind: "consegna",
      starts_at: "2026-05-20T10:00:00Z",
      ends_at: "2026-05-20T09:00:00Z",
      customer_id: null,
      case_id: null,
      vehicle_id: null,
      notes: null,
    });
    expect(r.success).toBe(false);
  });

  it("accetta ends_at uguale a starts_at", () => {
    const r = appointmentFormSchema.safeParse({
      title: "Sopralluogo",
      kind: "sopralluogo",
      starts_at: "2026-05-20T10:00:00Z",
      ends_at: "2026-05-20T10:00:00Z",
      customer_id: null,
      case_id: null,
      vehicle_id: null,
      notes: null,
    });
    expect(r.success).toBe(true);
  });

  it("rifiuta titolo vuoto", () => {
    const r = appointmentFormSchema.safeParse({
      title: "",
      kind: "altro",
      starts_at: "2026-05-20T10:00:00Z",
      ends_at: null,
      customer_id: null,
      case_id: null,
      vehicle_id: null,
      notes: null,
    });
    expect(r.success).toBe(false);
  });

  it("rifiuta UUID malformato in customer_id", () => {
    const r = appointmentFormSchema.safeParse({
      title: "Test",
      kind: "altro",
      starts_at: "2026-05-20T10:00:00Z",
      ends_at: null,
      customer_id: "not-a-uuid",
      case_id: null,
      vehicle_id: null,
      notes: null,
    });
    expect(r.success).toBe(false);
  });
});

describe("caseFormSchema", () => {
  it("normalizza price '1234,56' in 1234.56 numerico? No: rifiuta virgola", () => {
    // Il parser usa Number() che non tollera la virgola → comportamento attuale.
    // Test bloccante per evitare regressioni inattese.
    const r = caseFormSchema.safeParse({
      status: "preparazione",
      description: null,
      price: "1234,56",
      started_at: "2026-06-01",
      due_at: "2026-07-01",
    });
    expect(r.success).toBe(false);
  });

  it("accetta price stringa numerica e la converte a number", () => {
    const r = caseFormSchema.safeParse({
      status: "preparazione",
      description: null,
      price: "1234.50",
      started_at: "2026-06-01",
      due_at: "2026-07-01",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price).toBe(1234.5);
  });

  it("price vuoto diventa null", () => {
    const r = caseFormSchema.safeParse({
      status: "finitura",
      description: "lavoro",
      price: "",
      started_at: "2026-06-01",
      due_at: "2026-07-01",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price).toBeNull();
  });

  it("rifiuta due_at precedente a started_at", () => {
    const r = caseFormSchema.safeParse({
      status: "preparazione",
      description: null,
      price: "",
      started_at: "2026-07-01",
      due_at: "2026-06-01",
    });
    expect(r.success).toBe(false);
  });

  it("rifiuta started_at mancante", () => {
    const r = caseFormSchema.safeParse({
      status: "preparazione",
      description: null,
      price: "",
      started_at: "",
      due_at: "2026-07-01",
    });
    expect(r.success).toBe(false);
  });
});
