import { type NextRequest, NextResponse } from "next/server"
import { actionRecommendationEngine } from "@/lib/action-recommender"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context } = body

    if (!context || !context.ticket || !context.sentimentAnalysis) {
      return NextResponse.json(
        { error: "Invalid request: context with ticket and sentimentAnalysis is required" },
        { status: 400 },
      )
    }

    const recommendations = await actionRecommendationEngine.generateRecommendations(context)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Generate recommendations error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
