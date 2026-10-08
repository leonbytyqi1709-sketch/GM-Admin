import { NextResponse } from "next/server";
import { getAllBookings, createManualBooking } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const bookings = await getAllBookings();
    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API GET /api/bookings] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Abrufen der Buchungen" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, service, date, time } = body;

    if (!name || !phone || !service || !date || !time) {
      return NextResponse.json(
        { success: false, error: "Name, Telefonnummer, Service, Datum und Uhrzeit sind erforderlich." },
        { status: 400 }
      );
    }

    const booking = await createManualBooking(body);
    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("[API POST /api/bookings] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Erstellen des Termins" },
      { status: 500 }
    );
  }
}
