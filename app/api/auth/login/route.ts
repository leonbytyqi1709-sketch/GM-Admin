import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const masterPassword = process.env.MASTER_PASSWORD || "gmcutz2026";

    if (password && password.trim() === masterPassword.trim()) {
      return NextResponse.json({
        success: true,
        message: "Erfolgreich autorisiert",
        token: "gmcutz_session_" + Date.now().toString(36),
      });
    }

    return NextResponse.json(
      { success: false, error: "Ungültiges Master-Passwort. Bitte erneut versuchen." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Fehler bei der Anmeldung" },
      { status: 500 }
    );
  }
}
