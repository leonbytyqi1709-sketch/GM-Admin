import { NextResponse } from "next/server";
import { updateBookingStatus, updateBookingDetails, deleteBooking } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes, time, date } = body;

    if (status && !["confirmed", "cancelled", "completed", "in_progress", "blocked"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    await updateBookingDetails(id, { status, notes, time, date });
    return NextResponse.json({ success: true, id, status, notes, time, date });
  } catch (error: any) {
    console.error("[API PATCH /api/bookings/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteBooking(id);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("[API DELETE /api/bookings/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
