import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export interface SentimentAnalysis {
  sentiment: "positive" | "neutral" | "negative"
  score: number
  confidence: number
  emotions: string[]
  urgency: "low" | "medium" | "high" | "urgent"
  keyPhrases: string[]
}

const sentimentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  emotions: z.array(z.string()),
  urgency: z.enum(["low", "medium", "high", "urgent"]),
  keyPhrases: z.array(z.string()),
})

export class SentimentAnalyzer {
  async analyzeTicket(subject: string, description: string, customerHistory?: string): Promise<SentimentAnalysis> {
    try {
      const prompt = `
        Analyze the sentiment of this customer support ticket:
        
        Subject: ${subject}
        Description: ${description}
        ${customerHistory ? `Customer History: ${customerHistory}` : ""}
        
        Provide a comprehensive sentiment analysis including:
        - Overall sentiment (positive, neutral, negative)
        - Sentiment score (0-1, where 0 is very negative, 1 is very positive)
        - Confidence level (0-1)
        - Detected emotions (frustrated, angry, happy, confused, etc.)
        - Urgency level based on language and tone
        - Key phrases that influenced the sentiment
      `

      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: sentimentSchema,
        prompt,
      })

      return object
    } catch (error) {
      console.error("Sentiment analysis failed:", error)
      // Fallback to basic analysis
      return this.fallbackAnalysis(subject, description)
    }
  }

  async analyzeBatch(
    tickets: Array<{ subject: string; description: string; id: string }>,
  ): Promise<Map<string, SentimentAnalysis>> {
    const results = new Map<string, SentimentAnalysis>()

    // Process tickets in batches to avoid rate limits
    const batchSize = 5
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize)
      const promises = batch.map(async (ticket) => {
        const analysis = await this.analyzeTicket(ticket.subject, ticket.description)
        return { id: ticket.id, analysis }
      })

      const batchResults = await Promise.all(promises)
      batchResults.forEach(({ id, analysis }) => {
        results.set(id, analysis)
      })

      // Small delay between batches
      if (i + batchSize < tickets.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  private fallbackAnalysis(subject: string, description: string): SentimentAnalysis {
    const text = `${subject} ${description}`.toLowerCase()

    // Simple keyword-based fallback
    const negativeWords = ["problem", "issue", "broken", "error", "bug", "frustrated", "angry", "terrible", "awful"]
    const positiveWords = ["great", "excellent", "love", "amazing", "perfect", "thank", "appreciate", "wonderful"]

    const negativeCount = negativeWords.filter((word) => text.includes(word)).length
    const positiveCount = positiveWords.filter((word) => text.includes(word)).length

    let sentiment: "positive" | "neutral" | "negative" = "neutral"
    let score = 0.5

    if (positiveCount > negativeCount) {
      sentiment = "positive"
      score = 0.7
    } else if (negativeCount > positiveCount) {
      sentiment = "negative"
      score = 0.3
    }

    return {
      sentiment,
      score,
      confidence: 0.6,
      emotions: sentiment === "negative" ? ["frustrated"] : sentiment === "positive" ? ["satisfied"] : ["neutral"],
      urgency: negativeCount > 2 ? "high" : "medium",
      keyPhrases: [
        ...negativeWords.filter((word) => text.includes(word)),
        ...positiveWords.filter((word) => text.includes(word)),
      ],
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer()
