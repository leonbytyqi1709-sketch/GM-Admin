import { NextResponse } from "next/server";
import { cleanupOldBookings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const deletedCount = await cleanupOldBookings(5);
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} alte Termine (älter als 5 Tage) wurden automatisch gelöscht.`,
    });
  } catch (error: any) {
    console.error("[API POST /api/bookings/cleanup] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler bei der Bereinigung" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const deletedCount = await cleanupOldBookings(5);
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} alte Termine (älter als 5 Tage) wurden automatisch gelöscht.`,
    });
  } catch (error: any) {
    console.error("[API GET /api/bookings/cleanup] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler bei der Bereinigung" },
      { status: 500 }
    );
  }
}
