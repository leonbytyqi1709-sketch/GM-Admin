import { NextResponse } from "next/server";
import { lockdownDay, unlockDay } from "@/lib/db";

export const dynamic = "force-dynamic";

function getBerlinDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const date = body?.date || getBerlinDate();
    const reason = body?.reason || "Automatischer Feierabend";

    const result = await lockdownDay(date, reason);

    return NextResponse.json({
      ...result,
      message: `Feierabend aktiviert: ${result.count} freie Slots wurden gesperrt.`,
    });
  } catch (error: any) {
    console.error("[API POST /api/bookings/lockdown] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Aktivieren des Feierabends" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");

    if (!date) {
      try {
        const body = await req.json();
        date = body?.date;
      } catch {
        // Body may be empty
      }
    }

    if (!date) {
      date = getBerlinDate();
    }

    const result = await unlockDay(date);

    return NextResponse.json({
      ...result,
      message: `Feierabend-Sperre aufgehoben: ${result.count} gesperrte Slots wurden wieder freigegeben.`,
    });
  } catch (error: any) {
    console.error("[API DELETE /api/bookings/lockdown] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Aufheben der Sperre" },
      { status: 500 }
    );
  }
}
