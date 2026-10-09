import { NextResponse } from "next/server";
import { getAllPayments, createPayment } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payments = await getAllPayments();
    return NextResponse.json({
      success: true,
      count: payments.length,
      payments,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API GET /api/payments] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Abrufen der Zahlungen" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, service, amount, paymentMethod } = body;

    if (!clientName || !service || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: "Kundenname, Service und Betrag sind erforderlich." },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json(
        { success: false, error: "Ungültiger Betrag." },
        { status: 400 }
      );
    }

    const payment = await createPayment({
      bookingId: body.bookingId,
      clientName,
      service,
      amount: numericAmount,
      paymentMethod: paymentMethod === "karte" ? "karte" : "bar",
      date: body.date,
      time: body.time,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error("[API POST /api/payments] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Erfassen der Zahlung" },
      { status: 500 }
    );
  }
}
