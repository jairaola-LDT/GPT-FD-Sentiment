import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { SentimentAnalysis } from "./sentiment-analyzer"
import { operationsManualProcessor, type ManualSearchResult } from "./operations-manual"

export interface ActionRecommendation {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  category: "immediate" | "follow-up" | "escalation" | "information" | "resolution"
  steps: ActionStep[]
  estimatedTime: string
  requiredSkills: string[]
  successMetrics: string[]
  reasoning: string
  confidence: number
  manualReferences: string[]
  createdAt: string
}

export interface ActionStep {
  id: string
  order: number
  title: string
  description: string
  type: "communication" | "investigation" | "escalation" | "documentation" | "resolution"
  isRequired: boolean
  estimatedDuration: string
  resources?: string[]
}

export interface RecommendationContext {
  ticket: {
    id: string
    subject: string
    description: string
    customer: string
    priority: string
    status: string
    createdAt: string
  }
  sentimentAnalysis: SentimentAnalysis
  manualGuidance?: ManualSearchResult[]
  customerHistory?: {
    previousTickets: number
    satisfactionScore?: number
    preferredChannel?: string
  }
}

const actionSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum(["immediate", "follow-up", "escalation", "information", "resolution"]),
  steps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["communication", "investigation", "escalation", "documentation", "resolution"]),
      isRequired: z.boolean(),
      estimatedDuration: z.string(),
      resources: z.array(z.string()).optional(),
    }),
  ),
  estimatedTime: z.string(),
  requiredSkills: z.array(z.string()),
  successMetrics: z.array(z.string()),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
})

export class ActionRecommendationEngine {
  private recommendations: Map<string, ActionRecommendation[]> = new Map()

  async generateRecommendations(context: RecommendationContext): Promise<ActionRecommendation[]> {
    try {
      // First, search for relevant manual guidance if not provided
      let manualGuidance = context.manualGuidance
      if (!manualGuidance && operationsManualProcessor.getAllManuals().length > 0) {
        const manuals = operationsManualProcessor.getAllManuals()
        if (manuals.length > 0) {
          const searchQuery = `${context.ticket.subject} ${context.sentimentAnalysis.sentiment} ${context.sentimentAnalysis.urgency}`
          manualGuidance = await operationsManualProcessor.searchManual(manuals[0].id, {
            query: searchQuery,
            ticketContext: {
              subject: context.ticket.subject,
              description: context.ticket.description,
              sentiment: context.sentimentAnalysis.sentiment,
              urgency: context.sentimentAnalysis.urgency,
            },
          })
        }
      }

      // Generate multiple recommendation options
      const recommendations = await this.generateMultipleOptions(context, manualGuidance || [])

      // Store recommendations for the ticket
      this.recommendations.set(context.ticket.id, recommendations)

      return recommendations
    } catch (error) {
      console.error("Error generating recommendations:", error)
      return this.generateFallbackRecommendations(context)
    }
  }

  private async generateMultipleOptions(
    context: RecommendationContext,
    manualGuidance: ManualSearchResult[],
  ): Promise<ActionRecommendation[]> {
    const manualContext =
      manualGuidance.length > 0
        ? `\n\nRelevant company procedures:\n${manualGuidance
            .map((result) => `- ${result.section.title}: ${result.section.content.substring(0, 200)}...`)
            .join("\n")}`
        : ""

    const prompt = `
      As an expert customer service AI, analyze this support ticket and generate 2-3 different action recommendations:

      TICKET DETAILS:
      - ID: ${context.ticket.id}
      - Subject: ${context.ticket.subject}
      - Description: ${context.ticket.description}
      - Customer: ${context.ticket.customer}
      - Priority: ${context.ticket.priority}
      - Status: ${context.ticket.status}

      SENTIMENT ANALYSIS:
      - Sentiment: ${context.sentimentAnalysis.sentiment} (${Math.round(context.sentimentAnalysis.score * 100)}%)
      - Emotions: ${context.sentimentAnalysis.emotions.join(", ")}
      - Urgency: ${context.sentimentAnalysis.urgency}
      - Confidence: ${Math.round(context.sentimentAnalysis.confidence * 100)}%
      - Key phrases: ${context.sentimentAnalysis.keyPhrases.join(", ")}

      ${
        context.customerHistory
          ? `
      CUSTOMER HISTORY:
      - Previous tickets: ${context.customerHistory.previousTickets}
      - Satisfaction score: ${context.customerHistory.satisfactionScore || "N/A"}
      - Preferred channel: ${context.customerHistory.preferredChannel || "N/A"}
      `
          : ""
      }

      ${manualContext}

      Generate recommendations that:
      1. Address the customer's immediate needs based on sentiment and urgency
      2. Follow company procedures when available
      3. Provide clear, actionable steps
      4. Consider the customer's emotional state
      5. Include appropriate escalation paths
      6. Specify required skills and estimated time

      Provide different approaches (e.g., immediate resolution, investigation-first, escalation-focused).
    `

    // Generate primary recommendation
    const primaryRecommendation = await this.generateSingleRecommendation(prompt, context, "primary")

    // Generate alternative approaches
    const alternativePrompt =
      prompt +
      `\n\nGenerate an ALTERNATIVE approach that differs from the primary recommendation in strategy or priority.`
    const alternativeRecommendation = await this.generateSingleRecommendation(alternativePrompt, context, "alternative")

    const recommendations = [primaryRecommendation, alternativeRecommendation].filter(Boolean) as ActionRecommendation[]

    // Add escalation recommendation for high-priority negative sentiment
    if (
      context.sentimentAnalysis.sentiment === "negative" &&
      (context.sentimentAnalysis.urgency === "high" || context.sentimentAnalysis.urgency === "urgent")
    ) {
      const escalationRecommendation = await this.generateEscalationRecommendation(context)
      if (escalationRecommendation) {
        recommendations.push(escalationRecommendation)
      }
    }

    return recommendations
  }

  private async generateSingleRecommendation(
    prompt: string,
    context: RecommendationContext,
    type: "primary" | "alternative" | "escalation",
  ): Promise<ActionRecommendation | null> {
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: actionSchema,
        prompt,
      })

      const steps: ActionStep[] = object.steps.map((step, index) => ({
        id: `step-${index + 1}`,
        order: index + 1,
        title: step.title,
        description: step.description,
        type: step.type,
        isRequired: step.isRequired,
        estimatedDuration: step.estimatedDuration,
        resources: step.resources,
      }))

      return {
        id: `rec-${context.ticket.id}-${type}-${Date.now()}`,
        title: object.title,
        description: object.description,
        priority: object.priority,
        category: object.category,
        steps,
        estimatedTime: object.estimatedTime,
        requiredSkills: object.requiredSkills,
        successMetrics: object.successMetrics,
        reasoning: object.reasoning,
        confidence: object.confidence,
        manualReferences: [], // Will be populated from manual guidance
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`Error generating ${type} recommendation:`, error)
      return null
    }
  }

  private async generateEscalationRecommendation(context: RecommendationContext): Promise<ActionRecommendation | null> {
    const escalationPrompt = `
      Generate an ESCALATION-focused recommendation for this high-priority negative sentiment ticket:
      
      Ticket: ${context.ticket.subject}
      Sentiment: ${context.sentimentAnalysis.sentiment} (${context.sentimentAnalysis.urgency} urgency)
      Emotions: ${context.sentimentAnalysis.emotions.join(", ")}
      
      Focus on:
      - Immediate escalation paths
      - Damage control measures
      - Senior team involvement
      - Customer retention strategies
      - Rapid resolution approaches
    `

    return this.generateSingleRecommendation(escalationPrompt, context, "escalation")
  }

  private generateFallbackRecommendations(context: RecommendationContext): ActionRecommendation[] {
    const baseSteps: ActionStep[] = [
      {
        id: "step-1",
        order: 1,
        title: "Acknowledge the ticket",
        description: "Send initial response acknowledging receipt and setting expectations",
        type: "communication",
        isRequired: true,
        estimatedDuration: "5 minutes",
      },
      {
        id: "step-2",
        order: 2,
        title: "Investigate the issue",
        description: "Gather additional information and research the problem",
        type: "investigation",
        isRequired: true,
        estimatedDuration: "15 minutes",
      },
    ]

    // Customize based on sentiment
    if (context.sentimentAnalysis.sentiment === "negative") {
      baseSteps.unshift({
        id: "step-0",
        order: 0,
        title: "Priority handling",
        description: "Handle with extra care due to negative sentiment",
        type: "communication",
        isRequired: true,
        estimatedDuration: "2 minutes",
      })
    }

    return [
      {
        id: `rec-${context.ticket.id}-fallback-${Date.now()}`,
        title: "Standard Support Response",
        description: "Follow standard support procedures for this type of ticket",
        priority: context.sentimentAnalysis.urgency === "urgent" ? "urgent" : "medium",
        category: "immediate",
        steps: baseSteps,
        estimatedTime: "20-30 minutes",
        requiredSkills: ["Customer Service", "Problem Solving"],
        successMetrics: ["Customer response", "Issue resolution"],
        reasoning: "Fallback recommendation based on standard procedures",
        confidence: 0.6,
        manualReferences: [],
        createdAt: new Date().toISOString(),
      },
    ]
  }

  async executeAction(
    ticketId: string,
    recommendationId: string,
    stepId: string,
  ): Promise<{
    success: boolean
    message: string
    nextStep?: ActionStep
  }> {
    const recommendations = this.recommendations.get(ticketId)
    if (!recommendations) {
      return { success: false, message: "No recommendations found for this ticket" }
    }

    const recommendation = recommendations.find((r) => r.id === recommendationId)
    if (!recommendation) {
      return { success: false, message: "Recommendation not found" }
    }

    const step = recommendation.steps.find((s) => s.id === stepId)
    if (!step) {
      return { success: false, message: "Step not found" }
    }

    // Here you would integrate with actual systems (Freshdesk API, etc.)
    // For now, we'll simulate the execution
    console.log(`Executing step: ${step.title} for ticket ${ticketId}`)

    // Find next step
    const currentIndex = recommendation.steps.findIndex((s) => s.id === stepId)
    const nextStep = currentIndex < recommendation.steps.length - 1 ? recommendation.steps[currentIndex + 1] : undefined

    return {
      success: true,
      message: `Successfully executed: ${step.title}`,
      nextStep,
    }
  }

  getRecommendations(ticketId: string): ActionRecommendation[] {
    return this.recommendations.get(ticketId) || []
  }

  async updateRecommendationFeedback(
    ticketId: string,
    recommendationId: string,
    feedback: {
      effectiveness: number // 1-5 scale
      timeToComplete?: string
      customerSatisfaction?: number
      notes?: string
    },
  ): Promise<boolean> {
    // This would typically update a database with feedback for ML training
    console.log(`Feedback received for recommendation ${recommendationId}:`, feedback)
    return true
  }
}

export const actionRecommendationEngine = new ActionRecommendationEngine()
