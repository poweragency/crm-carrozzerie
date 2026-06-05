import { z } from "zod";

const trimmedOrNull = z
  .string()
  .transform((v) => v.trim())
  .transform((v) => (v.length === 0 ? null : v));

const emailOrNull = z
  .union([z.literal(""), z.string().email("Email non valida")])
  .transform((v) => (v === "" ? null : v));

const numericString = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Valore numerico non valido")
  .transform((v) => (v === "" ? null : Number(v)));

// ============================================================
// LEAD
// ============================================================

export const leadStatusEnum = z.enum([
  "nuovo",
  "contattato",
  "preventivo",
  "cliente",
  "perso",
]);

export const leadFormSchema = z.object({
  full_name: z.string().trim().min(1, "Il nome è obbligatorio").max(120),
  phone: trimmedOrNull.nullable(),
  email: emailOrNull.nullable(),
  message: trimmedOrNull.nullable(),
  status: leadStatusEnum,
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

// ============================================================
// CUSTOMER
// ============================================================

export const customerFormSchema = z.object({
  full_name: z.string().trim().min(1, "Il nome è obbligatorio").max(120),
  phone: trimmedOrNull.nullable(),
  email: emailOrNull.nullable(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

// ============================================================
// VEHICLE
// ============================================================

const PLATE_REGEX = /^[A-Z0-9 ]{4,12}$/;

export const vehicleFormSchema = z.object({
  make: trimmedOrNull.nullable(),
  model: trimmedOrNull.nullable(),
  plate: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .refine((v) => v === "" || PLATE_REGEX.test(v), "Targa non valida (es. AB123CD)")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  year: z
    .string()
    .transform((v) => v.trim())
    .refine(
      (v) =>
        v === "" ||
        (/^\d{4}$/.test(v) &&
          Number(v) >= 1900 &&
          Number(v) <= new Date().getFullYear() + 1),
      "Anno non valido"
    )
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable(),
  color: trimmedOrNull.nullable(),
  vin: trimmedOrNull.nullable(),
  notes: trimmedOrNull.nullable(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

// Form input: year arriva come string dall'input HTML, Zod la converte a number
export type VehicleFormInputValues = {
  make: string | null;
  model: string | null;
  plate: string | null;
  year: string | null;
  color: string | null;
  vin: string | null;
  notes: string | null;
};

// ============================================================
// CASE
// ============================================================

export const caseStatusEnum = z.enum([
  "preparazione",
  "verniciatura",
  "finitura",
  "controllo_titolare",
  "completata",
  "consegnata",
  "liquidato",
]);

const dateRequired = z
  .string()
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s), "Data obbligatoria");

export const caseFormSchema = z
  .object({
    status: caseStatusEnum,
    price: numericString.nullable(),
    description: trimmedOrNull.nullable(),
    started_at: dateRequired,
    due_at: dateRequired,
  })
  .refine((v) => v.due_at >= v.started_at, {
    message: "La scadenza non può precedere l'inizio",
    path: ["due_at"],
  });

export type CaseFormValues = z.infer<typeof caseFormSchema>;

export type CaseFormInputValues = {
  status: z.infer<typeof caseStatusEnum>;
  description: string | null;
  price: string;
  started_at: string;
  due_at: string;
};

// ============================================================
// APPOINTMENT
// ============================================================

export const appointmentKindEnum = z.enum([
  "accettazione",
  "consegna",
  "sopralluogo",
  "lavorazione",
  "altro",
]);

export const appointmentFormSchema = z
  .object({
    title: z.string().trim().min(1, "Titolo obbligatorio").max(200),
    kind: appointmentKindEnum,
    starts_at: z.string().min(1, "Data inizio obbligatoria"),
    ends_at: z.string().nullable().optional(),
    customer_id: z.string().uuid().nullable().optional(),
    case_id: z.string().uuid().nullable().optional(),
    vehicle_id: z.string().uuid().nullable().optional(),
    notes: trimmedOrNull.nullable(),
  })
  .refine(
    (v) => !v.ends_at || new Date(v.ends_at).getTime() >= new Date(v.starts_at).getTime(),
    { message: "La fine deve essere dopo l'inizio", path: ["ends_at"] }
  );

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

// ============================================================
// INVOICE
// ============================================================

export const invoiceKindEnum = z.enum(["preventivo", "fattura"]);
export const invoiceStatusEnum = z.enum([
  "bozza",
  "inviato",
  "accettato",
  "rifiutato",
  "pagato",
  "scaduto",
]);

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Descrizione obbligatoria").max(500),
  quantity: z.number().min(0.01, "Quantità minima 0.01"),
  unit_price: z.number().min(0, "Prezzo minimo 0"),
});

export type InvoiceItemValues = z.infer<typeof invoiceItemSchema>;

export const invoiceFormSchema = z.object({
  kind: invoiceKindEnum,
  status: invoiceStatusEnum,
  issued_at: z.string().min(1, "Data emissione obbligatoria"),
  due_at: z.string().nullable().optional(),
  vat_rate: z.number().min(0).max(100),
  notes: trimmedOrNull.nullable(),
  items: z.array(invoiceItemSchema).min(1, "Aggiungi almeno una riga"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// ============================================================
// PROFILE
// ============================================================

export const profileFormSchema = z.object({
  workshop_name: z.string().trim().min(1, "Nome carrozzeria obbligatorio").max(200),
  phone: trimmedOrNull.nullable(),
  vat_number: trimmedOrNull.nullable(),
  tax_code: trimmedOrNull.nullable(),
  address: trimmedOrNull.nullable(),
  city: trimmedOrNull.nullable(),
  postal_code: trimmedOrNull.nullable(),
  province: trimmedOrNull.nullable(),
  iban: trimmedOrNull.nullable(),
  invoice_prefix: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine(
      (v) => v === "" || /^[A-Z0-9-]{2,10}$/.test(v),
      "Prefisso non valido (es. PREV)"
    )
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  fb_page_id: trimmedOrNull.nullable(),
  fb_page_access_token: trimmedOrNull.nullable(),
  logo_url: trimmedOrNull.nullable(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
