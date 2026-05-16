"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  brand: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  brandText: {
    flexDirection: "column",
    gap: 2,
  },
  brandLogo: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  brandName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  meta: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  metaTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  small: { fontSize: 9, color: "#666" },

  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  party: { width: "48%" },
  partyLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },

  vehicleBox: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 3,
    marginBottom: 16,
  },

  table: { marginBottom: 12 },
  trHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  th: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  tr: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  td: { fontSize: 10 },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },

  totals: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 2,
  },
  totalsLabel: { fontSize: 10, color: "#555" },
  totalsValue: { fontSize: 10 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },

  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    fontSize: 8,
    color: "#666",
  },
  notesBox: {
    marginTop: 14,
    padding: 8,
    backgroundColor: "#fafafa",
    fontSize: 9,
    color: "#444",
  },
});

interface InvoicePDFProps {
  kind: "preventivo" | "fattura";
  number: string;
  issuedAt: string;
  dueAt: string | null;
  workshop: {
    name: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    vatNumber: string | null;
    taxCode: string | null;
    phone: string | null;
    email: string;
    iban: string | null;
    logoUrl: string | null;
  };
  customer: {
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  vehicle: {
    make: string | null;
    model: string | null;
    plate: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string | null;
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function InvoicePDF(props: InvoicePDFProps) {
  const { kind, number, issuedAt, dueAt, workshop, customer, vehicle, items } = props;
  const title = kind === "preventivo" ? "Preventivo" : "Fattura";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {workshop.logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={workshop.logoUrl} style={styles.brandLogo} />
            )}
            <View style={styles.brandText}>
              <Text style={styles.brandName}>{workshop.name}</Text>
              {workshop.address && <Text style={styles.small}>{workshop.address}</Text>}
              {(workshop.postalCode || workshop.city || workshop.province) && (
                <Text style={styles.small}>
                  {[workshop.postalCode, workshop.city, workshop.province]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              )}
              {workshop.vatNumber && (
                <Text style={styles.small}>P.IVA {workshop.vatNumber}</Text>
              )}
              {workshop.taxCode && (
                <Text style={styles.small}>CF {workshop.taxCode}</Text>
              )}
              <Text style={styles.small}>
                {workshop.email}
                {workshop.phone ? ` · ${workshop.phone}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{title}</Text>
            <Text>N. {number}</Text>
            <Text style={styles.small}>Data: {fmtDate(issuedAt)}</Text>
            {dueAt && <Text style={styles.small}>Scadenza: {fmtDate(dueAt)}</Text>}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Cliente</Text>
            <Text style={styles.partyName}>{customer.fullName}</Text>
            {customer.phone && <Text>{customer.phone}</Text>}
            {customer.email && <Text>{customer.email}</Text>}
          </View>
        </View>

        {vehicle && (vehicle.make || vehicle.model || vehicle.plate) && (
          <View style={styles.vehicleBox}>
            <Text style={styles.partyLabel}>Veicolo</Text>
            <Text>
              {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
              {vehicle.plate ? ` · Targa ${vehicle.plate}` : ""}
            </Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.th, styles.colDescription]}>Descrizione</Text>
            <Text style={[styles.th, styles.colQty]}>Qta</Text>
            <Text style={[styles.th, styles.colPrice]}>Prezzo</Text>
            <Text style={[styles.th, styles.colTotal]}>Totale</Text>
          </View>
          {items.map((it, idx) => (
            <View key={idx} style={styles.tr}>
              <Text style={[styles.td, styles.colDescription]}>{it.description}</Text>
              <Text style={[styles.td, styles.colQty]}>{it.quantity}</Text>
              <Text style={[styles.td, styles.colPrice]}>{fmtEUR(it.unitPrice)}</Text>
              <Text style={[styles.td, styles.colTotal]}>{fmtEUR(it.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Imponibile</Text>
            <Text style={styles.totalsValue}>{fmtEUR(props.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>IVA {props.vatRate}%</Text>
            <Text style={styles.totalsValue}>{fmtEUR(props.vatAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Totale</Text>
            <Text style={styles.grandTotalValue}>{fmtEUR(props.total)}</Text>
          </View>
        </View>

        {props.notes && (
          <View style={styles.notesBox}>
            <Text>{props.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {workshop.iban && <Text>Coordinate bancarie: {workshop.iban}</Text>}
          <Text>
            {title} generato da CRM Officina · {fmtDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
