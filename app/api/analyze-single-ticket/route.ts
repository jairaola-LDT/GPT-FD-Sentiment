import { type NextRequest, NextResponse } from "next/server"
import { sentimentAnalyzer } from "@/lib/sentiment-analyzer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, description, customerHistory } = body

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 400 })
    }

    const analysis = await sentimentAnalyzer.analyzeTicket(subject, description, customerHistory)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Single ticket sentiment analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze ticket sentiment" }, { status: 500 })
  }
}
