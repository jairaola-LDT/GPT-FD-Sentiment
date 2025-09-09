import { type NextRequest, NextResponse } from "next/server"
import { operationsManualProcessor } from "@/lib/operations-manual"

export async function GET() {
  try {
    const manuals = operationsManualProcessor.getAllManuals()
    return NextResponse.json({ manuals })
  } catch (error) {
    console.error("Get manuals error:", error)
    return NextResponse.json({ error: "Failed to retrieve manuals" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const manualId = searchParams.get("id")

    if (!manualId) {
      return NextResponse.json({ error: "Manual ID is required" }, { status: 400 })
    }

    const deleted = operationsManualProcessor.deleteManual(manualId)

    if (!deleted) {
      return NextResponse.json({ error: "Manual not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete manual error:", error)
    return NextResponse.json({ error: "Failed to delete manual" }, { status: 500 })
  }
}
