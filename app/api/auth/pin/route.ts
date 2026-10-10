import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const serverPin = process.env.KASSEN_PIN || "7744";

    if (pin && pin.toString().trim() === serverPin.trim()) {
      return NextResponse.json({
        success: true,
        message: "Kassen-PIN verifiziert",
      });
    }

    return NextResponse.json(
      { success: false, error: "Ungültiger Sicherheits-PIN. Zugriff verweigert." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Fehler bei PIN-Prüfung" },
      { status: 500 }
    );
  }
}
