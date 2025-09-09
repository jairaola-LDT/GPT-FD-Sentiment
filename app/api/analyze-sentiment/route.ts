import { type NextRequest, NextResponse } from "next/server"
import { sentimentAnalyzer } from "@/lib/sentiment-analyzer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tickets } = body

    if (!tickets || !Array.isArray(tickets)) {
      return NextResponse.json({ error: "Invalid request: tickets array is required" }, { status: 400 })
    }

    // Analyze sentiment for all tickets
    const sentimentResults = await sentimentAnalyzer.analyzeBatch(tickets)

    // Convert Map to object for JSON response
    const results: Record<string, any> = {}
    sentimentResults.forEach((analysis, ticketId) => {
      results[ticketId] = analysis
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Sentiment analysis API error:", error)
    return NextResponse.json({ error: "Failed to analyze sentiment" }, { status: 500 })
  }
}
