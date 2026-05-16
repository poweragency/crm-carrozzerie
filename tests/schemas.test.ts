import { describe, it, expect } from "vitest";
import {
  leadFormSchema,
  customerFormSchema,
  vehicleFormSchema,
  profileFormSchema,
} from "@/lib/schemas";

describe("leadFormSchema", () => {
  it("accetta un lead valido", () => {
    const result = leadFormSchema.safeParse({
      full_name: "Mario Rossi",
      phone: "+39 333 1234567",
      email: "mario@example.com",
      message: null,
      status: "nuovo",
    });
    expect(result.success).toBe(true);
  });

  it("rifiuta lead senza nome", () => {
    const result = leadFormSchema.safeParse({
      full_name: "",
      phone: null,
      email: null,
      message: null,
      status: "nuovo",
    });
    expect(result.success).toBe(false);
  });

  it("normalizza email vuota a null", () => {
    const result = leadFormSchema.safeParse({
      full_name: "Mario",
      phone: null,
      email: "",
      message: null,
      status: "nuovo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
    }
  });

  it("rifiuta status non valido", () => {
    const result = leadFormSchema.safeParse({
      full_name: "Mario",
      phone: null,
      email: null,
      message: null,
      status: "qualcosa_di_strano",
    });
    expect(result.success).toBe(false);
  });
});

describe("customerFormSchema", () => {
  it("accetta cliente valido", () => {
    const result = customerFormSchema.safeParse({
      full_name: "Anna Bianchi",
      phone: "06 1234",
      email: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("vehicleFormSchema", () => {
  it("accetta veicolo valido con targa formattata", () => {
    const result = vehicleFormSchema.safeParse({
      make: "Fiat",
      model: "Panda",
      plate: "AB 123 CD",
      year: "2020",
      color: "rosso",
      vin: null,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2020);
    }
  });

  it("rifiuta targa invalida con caratteri non ammessi", () => {
    const result = vehicleFormSchema.safeParse({
      make: "Fiat",
      model: "Panda",
      plate: "@@@",
      year: "",
      color: null,
      vin: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("profileFormSchema", () => {
  it("normalizza invoice_prefix in uppercase", () => {
    const result = profileFormSchema.safeParse({
      workshop_name: "Officina Test",
      phone: null,
      vat_number: null,
      tax_code: null,
      address: null,
      city: null,
      postal_code: null,
      province: null,
      iban: null,
      invoice_prefix: "prev",
      fb_page_id: null,
      fb_page_access_token: null,
      logo_url: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoice_prefix).toBe("PREV");
    }
  });

  it("rifiuta workshop_name vuoto", () => {
    const result = profileFormSchema.safeParse({
      workshop_name: "",
      phone: null,
      vat_number: null,
      tax_code: null,
      address: null,
      city: null,
      postal_code: null,
      province: null,
      iban: null,
      invoice_prefix: null,
      fb_page_id: null,
      fb_page_access_token: null,
      logo_url: null,
    });
    expect(result.success).toBe(false);
  });
});
