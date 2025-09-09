import { generateObject, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export interface ManualSection {
  id: string
  title: string
  content: string
  category: string
  keywords: string[]
  priority: "low" | "medium" | "high"
  lastUpdated: string
}

export interface ProcessedManual {
  id: string
  name: string
  sections: ManualSection[]
  uploadedAt: string
  processedAt: string
  status: "processing" | "ready" | "error"
}

export interface ManualQuery {
  query: string
  ticketContext?: {
    subject: string
    description: string
    sentiment: string
    urgency: string
  }
}

export interface ManualSearchResult {
  section: ManualSection
  relevanceScore: number
  matchedKeywords: string[]
}

const sectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  priority: z.enum(["low", "medium", "high"]),
})

export class OperationsManualProcessor {
  private manuals: Map<string, ProcessedManual> = new Map()

  async processManualText(manualId: string, name: string, text: string): Promise<ProcessedManual> {
    try {
      // Split text into logical sections
      const sections = await this.extractSections(text)

      const processedManual: ProcessedManual = {
        id: manualId,
        name,
        sections,
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        status: "ready",
      }

      this.manuals.set(manualId, processedManual)
      return processedManual
    } catch (error) {
      console.error("Error processing manual:", error)
      const errorManual: ProcessedManual = {
        id: manualId,
        name,
        sections: [],
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        status: "error",
      }
      this.manuals.set(manualId, errorManual)
      return errorManual
    }
  }

  private async extractSections(text: string): Promise<ManualSection[]> {
    // Split text into chunks for processing
    const chunks = this.splitIntoChunks(text, 2000)
    const sections: ManualSection[] = []

    for (let i = 0; i < chunks.length; i++) {
      try {
        const prompt = `
          Analyze this section of an operations manual and extract structured information:
          
          Text: ${chunks[i]}
          
          Extract:
          - A clear, descriptive title for this section
          - The main content (cleaned and formatted)
          - A category (e.g., "Customer Service", "Technical Support", "Billing", "Escalation", "General")
          - Relevant keywords for searching
          - Priority level based on how critical this information is for customer support
        `

        const { object } = await generateObject({
          model: openai("gpt-4o"),
          schema: sectionSchema,
          prompt,
        })

        sections.push({
          id: `section-${i + 1}`,
          title: object.title,
          content: object.content,
          category: object.category,
          keywords: object.keywords,
          priority: object.priority,
          lastUpdated: new Date().toISOString(),
        })

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error processing section ${i + 1}:`, error)
        // Create a fallback section
        sections.push({
          id: `section-${i + 1}`,
          title: `Section ${i + 1}`,
          content: chunks[i],
          category: "General",
          keywords: [],
          priority: "medium",
          lastUpdated: new Date().toISOString(),
        })
      }
    }

    return sections
  }

  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    const paragraphs = text.split(/\n\s*\n/)
    const chunks: string[] = []
    let currentChunk = ""

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  async searchManual(manualId: string, query: ManualQuery): Promise<ManualSearchResult[]> {
    const manual = this.manuals.get(manualId)
    if (!manual || manual.status !== "ready") {
      return []
    }

    try {
      // Use AI to find the most relevant sections
      const searchPrompt = `
        Find the most relevant sections from this operations manual for the following query:
        
        Query: ${query.query}
        ${
          query.ticketContext
            ? `
        Ticket Context:
        - Subject: ${query.ticketContext.subject}
        - Description: ${query.ticketContext.description}
        - Sentiment: ${query.ticketContext.sentiment}
        - Urgency: ${query.ticketContext.urgency}
        `
            : ""
        }
        
        Available sections:
        ${manual.sections
          .map(
            (section, index) => `
        ${index + 1}. ${section.title} (Category: ${section.category}, Priority: ${section.priority})
        Keywords: ${section.keywords.join(", ")}
        Content preview: ${section.content.substring(0, 200)}...
        `,
          )
          .join("\n")}
        
        Return the section numbers (1-based) that are most relevant, ranked by relevance.
        Consider the ticket context, sentiment, and urgency when ranking.
      `

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: searchPrompt,
      })

      // Parse the AI response to extract section numbers
      const sectionNumbers = this.extractSectionNumbers(text)
      const results: ManualSearchResult[] = []

      for (const sectionNum of sectionNumbers) {
        const section = manual.sections[sectionNum - 1]
        if (section) {
          // Calculate relevance score based on various factors
          const relevanceScore = this.calculateRelevanceScore(section, query)
          const matchedKeywords = this.findMatchedKeywords(section, query.query)

          results.push({
            section,
            relevanceScore,
            matchedKeywords,
          })
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } catch (error) {
      console.error("Error searching manual:", error)
      // Fallback to simple keyword matching
      return this.fallbackSearch(manual, query)
    }
  }

  private extractSectionNumbers(text: string): number[] {
    const numbers: number[] = []
    const matches = text.match(/\b(\d+)\b/g)

    if (matches) {
      for (const match of matches) {
        const num = Number.parseInt(match, 10)
        if (num > 0 && !numbers.includes(num)) {
          numbers.push(num)
        }
      }
    }

    return numbers.slice(0, 5) // Limit to top 5 results
  }

  private calculateRelevanceScore(section: ManualSection, query: ManualQuery): number {
    let score = 0
    const queryLower = query.query.toLowerCase()
    const contentLower = section.content.toLowerCase()
    const titleLower = section.title.toLowerCase()

    // Title match (highest weight)
    if (titleLower.includes(queryLower)) score += 0.4

    // Content match
    const queryWords = queryLower.split(/\s+/)
    const matchedWords = queryWords.filter((word) => contentLower.includes(word))
    score += (matchedWords.length / queryWords.length) * 0.3

    // Keyword match
    const matchedKeywords = section.keywords.filter((keyword) => queryLower.includes(keyword.toLowerCase()))
    score += (matchedKeywords.length / Math.max(section.keywords.length, 1)) * 0.2

    // Priority boost
    if (section.priority === "high") score += 0.1
    else if (section.priority === "medium") score += 0.05

    // Context-based boost
    if (query.ticketContext) {
      if (query.ticketContext.urgency === "urgent" && section.priority === "high") {
        score += 0.1
      }
      if (query.ticketContext.sentiment === "negative" && section.category === "Escalation") {
        score += 0.1
      }
    }

    return Math.min(score, 1) // Cap at 1.0
  }

  private findMatchedKeywords(section: ManualSection, query: string): string[] {
    const queryLower = query.toLowerCase()
    return section.keywords.filter((keyword) => queryLower.includes(keyword.toLowerCase()))
  }

  private fallbackSearch(manual: ProcessedManual, query: ManualQuery): ManualSearchResult[] {
    const results: ManualSearchResult[] = []
    const queryLower = query.query.toLowerCase()

    for (const section of manual.sections) {
      const relevanceScore = this.calculateRelevanceScore(section, query)
      if (relevanceScore > 0.1) {
        // Only include sections with some relevance
        results.push({
          section,
          relevanceScore,
          matchedKeywords: this.findMatchedKeywords(section, query.query),
        })
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5)
  }

  getManual(manualId: string): ProcessedManual | undefined {
    return this.manuals.get(manualId)
  }

  getAllManuals(): ProcessedManual[] {
    return Array.from(this.manuals.values())
  }

  deleteManual(manualId: string): boolean {
    return this.manuals.delete(manualId)
  }
}

export const operationsManualProcessor = new OperationsManualProcessor()
