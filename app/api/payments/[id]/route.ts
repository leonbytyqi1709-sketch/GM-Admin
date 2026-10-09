import { NextResponse } from "next/server";
import { deletePayment } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePayment(id);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("[API DELETE /api/payments/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Löschen der Zahlung" },
      { status: 500 }
    );
  }
}
