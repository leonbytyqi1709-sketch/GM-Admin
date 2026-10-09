import { neon } from "@neondatabase/serverless";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "in_progress" | "blocked";

export interface BookingRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  addons: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  status: BookingStatus;
  createdAt: string;
}

function getSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL ist nicht in den Umgebungsvariablen gesetzt.");
  }
  return neon(dbUrl);
}

let lastCleanupTimestamp = 0;

/**
 * Löscht automatisch alte, vergangene Termine, deren Datum mehr als 5 Tage in der Vergangenheit liegt.
 * Wichtig: Anstehende und heutige Termine bleiben immer unberührt!
 */
export async function cleanupOldBookings(daysThreshold: number = 5): Promise<number> {
  const sql = getSql();

  // Berechne Stichtag: Datum vor 5 Tagen (Format YYYY-MM-DD)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, "0");
  const d = String(cutoff.getDate()).padStart(2, "0");
  const cutoffDateStr = `${y}-${m}-${d}`;

  try {
    const deletedRows = await sql`
      DELETE FROM bookings
      WHERE date < ${cutoffDateStr}
      RETURNING id, name, date, time
    `;
    if (deletedRows.length > 0) {
      console.log(`[Auto-Cleanup] ${deletedRows.length} alte Termine vor ${cutoffDateStr} gelöscht.`);
    }
    return deletedRows.length;
  } catch (err) {
    console.error("[Auto-Cleanup] Fehler beim Bereinigen alter Termine:", err);
    return 0;
  }
}

/**
 * Holt alle Buchungen aus Neon PostgreSQL und führt im Hintergrund
 * die automatische 5-Tage-Bereinigung alter Termine durch.
 */
export async function getAllBookings(): Promise<BookingRecord[]> {
  const now = Date.now();
  // Alle 10 Minuten im Hintergrund prüfen und aufräumen
  if (now - lastCleanupTimestamp > 10 * 60 * 1000) {
    lastCleanupTimestamp = now;
    cleanupOldBookings(5).catch((err) => console.error(err));
  }

  const sql = getSql();
  const rows = await sql`
    SELECT id, name, email, phone, service, addons, date, time, notes, status, created_at
    FROM bookings
    ORDER BY date ASC, time ASC
  `;

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    addons: typeof row.addons === "string" ? JSON.parse(row.addons || "[]") : (row.addons || []),
    date: row.date,
    time: row.time,
    notes: row.notes || "",
    status: row.status || "confirmed",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));
}

/**
 * Aktualisiert den Status einer Buchung (z.B. 'completed', 'cancelled', 'confirmed', 'in_progress', 'blocked')
 */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<boolean> {
  const sql = getSql();
  await sql`
    UPDATE bookings
    SET status = ${status}
    WHERE id = ${id}
  `;
  return true;
}

/**
 * Aktualisiert flexibel Felder einer Buchung (Status, Notizen, Zeit, Datum)
 */
export async function updateBookingDetails(
  id: string,
  data: {
    status?: BookingStatus;
    notes?: string;
    time?: string;
    date?: string;
  }
): Promise<boolean> {
  const sql = getSql();
  if (data.status !== undefined) {
    await sql`UPDATE bookings SET status = ${data.status} WHERE id = ${id}`;
  }
  if (data.notes !== undefined) {
    await sql`UPDATE bookings SET notes = ${data.notes} WHERE id = ${id}`;
  }
  if (data.time !== undefined) {
    await sql`UPDATE bookings SET time = ${data.time} WHERE id = ${id}`;
  }
  if (data.date !== undefined) {
    await sql`UPDATE bookings SET date = ${data.date} WHERE id = ${id}`;
  }
  return true;
}

/**
 * Löscht eine Buchung endgültig
 */
export async function deleteBooking(id: string): Promise<boolean> {
  const sql = getSql();
  await sql`
    DELETE FROM bookings
    WHERE id = ${id}
  `;
  return true;
}

/**
 * Erstellt eine manuelle Buchung direkt über das Dashboard
 */
export async function createManualBooking(data: {
  name: string;
  phone: string;
  email?: string;
  service: string;
  addons?: string[];
  date: string;
  time: string;
  notes?: string;
  status?: BookingStatus;
}): Promise<BookingRecord> {
  const sql = getSql();
  const id = "GM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const createdAt = new Date().toISOString();
  const addons = data.addons || [];
  const email = data.email || "vor-ort@gmcutz.de";
  const notes = data.notes || "Direktbuchung im Salon";
  const status = data.status || "confirmed";

  await sql`
    INSERT INTO bookings (id, name, email, phone, service, addons, date, time, notes, status, created_at)
    VALUES (
      ${id},
      ${data.name},
      ${email},
      ${data.phone},
      ${data.service},
      ${JSON.stringify(addons)},
      ${data.date},
      ${data.time},
      ${notes},
      ${status},
      ${createdAt}
    )
  `;

  return {
    id,
    name: data.name,
    email,
    phone: data.phone,
    service: data.service,
    addons,
    date: data.date,
    time: data.time,
    notes,
    status,
    createdAt,
  };
}

export interface PaymentRecord {
  id: string;
  bookingId?: string | null;
  clientName: string;
  service: string;
  amount: number;
  paymentMethod: "bar" | "karte";
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  createdAt: string;
}

let paymentsTableChecked = false;

export async function ensurePaymentsTable(): Promise<void> {
  if (paymentsTableChecked) return;
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT,
        client_name TEXT NOT NULL,
        service TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'bar',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    paymentsTableChecked = true;
  } catch (err) {
    console.error("[DB] Fehler beim Erstellen der payments-Tabelle:", err);
  }
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  await ensurePaymentsTable();
  const sql = getSql();
  const rows = await sql`
    SELECT id, booking_id, client_name, service, amount, payment_method, date, time, notes, created_at
    FROM payments
    ORDER BY date DESC, time DESC, created_at DESC
  `;
  return rows.map((r: any) => ({
    id: r.id,
    bookingId: r.booking_id || null,
    clientName: r.client_name,
    service: r.service,
    amount: parseFloat(r.amount) || 0,
    paymentMethod: (r.payment_method === "karte" ? "karte" : "bar") as "bar" | "karte",
    date: r.date,
    time: r.time,
    notes: r.notes || "",
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  }));
}

export async function createPayment(data: {
  bookingId?: string;
  clientName: string;
  service: string;
  amount: number;
  paymentMethod: "bar" | "karte";
  date?: string;
  time?: string;
  notes?: string;
}): Promise<PaymentRecord> {
  await ensurePaymentsTable();
  const sql = getSql();
  const id = "PAY-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  
  const date = data.date || `${y}-${m}-${d}`;
  const time = data.time || `${hh}:${mm}`;
  const notes = data.notes || "";
  const createdAt = now.toISOString();

  await sql`
    INSERT INTO payments (id, booking_id, client_name, service, amount, payment_method, date, time, notes, created_at)
    VALUES (
      ${id},
      ${data.bookingId || null},
      ${data.clientName},
      ${data.service},
      ${data.amount},
      ${data.paymentMethod},
      ${date},
      ${time},
      ${notes},
      ${createdAt}
    )
  `;

  return {
    id,
    bookingId: data.bookingId || null,
    clientName: data.clientName,
    service: data.service,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    date,
    time,
    notes,
    createdAt,
  };
}

export async function deletePayment(id: string): Promise<boolean> {
  await ensurePaymentsTable();
  const sql = getSql();
  await sql`
    DELETE FROM payments
    WHERE id = ${id}
  `;
  return true;
}

