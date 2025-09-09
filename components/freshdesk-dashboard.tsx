"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Clock, MessageSquare, Settings, TrendingUp, Zap, Brain } from "lucide-react"
import { SentimentBadge } from "@/components/sentiment-badge"
import { useSentimentAnalysis } from "@/hooks/use-sentiment-analysis"
import type { SentimentAnalysis } from "@/lib/sentiment-analyzer"
import { ManualUpload } from "@/components/manual-upload"
import { ManualSearch } from "@/components/manual-search"
import { ActionRecommendations } from "@/components/action-recommendations"
import type { RecommendationContext } from "@/lib/action-recommender"

interface Ticket {
  id: string
  subject: string
  description: string
  customer: string
  sentiment: "positive" | "neutral" | "negative"
  sentimentScore: number
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "pending" | "resolved"
  recommendedAction: string
  createdAt: string
  sentimentAnalysis?: SentimentAnalysis
}

interface IntegrationStatus {
  freshdesk: boolean
  gpt: boolean
  operationsManual: boolean
}

export function FreshdeskDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    freshdesk: false,
    gpt: false,
    operationsManual: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { analyzeBatch, isAnalyzing } = useSentimentAnalysis()

  useEffect(() => {
    // Simulate loading initial data
    setTimeout(async () => {
      const mockTickets: Ticket[] = [
        {
          id: "FD-001",
          subject: "Unable to login to account",
          description:
            "I've been trying to login for the past hour and keep getting error messages. This is extremely frustrating as I need to access my account urgently for an important meeting. The error says 'invalid credentials' but I'm sure my password is correct. I've tried resetting it twice already. Please help me immediately!",
          customer: "John Smith",
          sentiment: "negative",
          sentimentScore: 0.2,
          priority: "high",
          status: "open",
          recommendedAction: "Escalate to technical support team immediately",
          createdAt: "2024-01-15T10:30:00Z",
        },
        {
          id: "FD-002",
          subject: "Great service, small feature request",
          description:
            "I absolutely love using your platform! The interface is intuitive and the features work perfectly. I was wondering if you could add a dark mode option? It would be amazing to have this feature for late-night work sessions. Thank you for creating such a wonderful product!",
          customer: "Sarah Johnson",
          sentiment: "positive",
          sentimentScore: 0.8,
          priority: "low",
          status: "pending",
          recommendedAction: "Thank customer and forward to product team",
          createdAt: "2024-01-15T09:15:00Z",
        },
        {
          id: "FD-003",
          subject: "Question about billing",
          description:
            "Hi, I have a question about my recent invoice. I noticed there's a charge I don't recognize. Could you please explain what the 'Premium Support' line item is for? I don't recall signing up for this service. Thanks for your help.",
          customer: "Mike Davis",
          sentiment: "neutral",
          sentimentScore: 0.5,
          priority: "medium",
          status: "open",
          recommendedAction: "Provide billing information and FAQ link",
          createdAt: "2024-01-15T08:45:00Z",
        },
      ]

      setTickets(mockTickets)
      setSelectedTicket(mockTickets[0]) // Select first ticket by default

      setIntegrationStatus({
        freshdesk: true,
        gpt: true,
        operationsManual: false,
      })

      const ticketsForAnalysis = mockTickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
      }))

      const sentimentResults = await analyzeBatch(ticketsForAnalysis)

      if (sentimentResults) {
        setTickets((prevTickets) =>
          prevTickets.map((ticket) => ({
            ...ticket,
            sentimentAnalysis: sentimentResults[ticket.id],
            // Update legacy fields with AI analysis
            sentiment: sentimentResults[ticket.id]?.sentiment || ticket.sentiment,
            sentimentScore: sentimentResults[ticket.id]?.score || ticket.sentimentScore,
          })),
        )
      }

      setIsLoading(false)
    }, 1000)
  }, [analyzeBatch])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-accent text-accent-foreground"
      case "negative":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Create recommendation context for selected ticket
  const getRecommendationContext = (ticket: Ticket): RecommendationContext | null => {
    if (!ticket.sentimentAnalysis) return null

    return {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        customer: ticket.customer,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      sentimentAnalysis: ticket.sentimentAnalysis,
      customerHistory: {
        previousTickets: Math.floor(Math.random() * 10) + 1,
        satisfactionScore: Math.random() * 5,
        preferredChannel: "email",
      },
    }
  }

  if (isLoading || isAnalyzing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {isAnalyzing ? "Analyzing sentiment with AI..." : "Loading Freshdesk GPT Agent..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Freshdesk GPT Agent</h1>
                <Badge variant="secondary" className="ml-2">
                  <Brain className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Integration Status Alert */}
        {!integrationStatus.operationsManual && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              Operations manual integration is not configured. Some features may be limited.
              <Button variant="link" className="p-0 h-auto ml-2">
                Configure now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "open").length}</div>
              <p className="text-xs text-muted-foreground">+2 from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((tickets.reduce((acc, t) => acc + t.sentimentScore, 0) / tickets.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">AI-analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4h</div>
              <p className="text-xs text-muted-foreground">-0.3h from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">+2% from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tickets">Ticket Analysis</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Overview</TabsTrigger>
            <TabsTrigger value="actions">Recommended Actions</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets with AI Analysis</CardTitle>
                <CardDescription>
                  Customer tickets analyzed for sentiment and recommended actions using GPT-4
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-all ${
                        selectedTicket?.id === ticket.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{ticket.id}</span>
                            <Badge variant="outline">{ticket.status}</Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          </div>
                          <h3 className="font-semibold">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground">Customer: {ticket.customer}</p>
                        </div>
                        <div className="text-right space-y-2">
                          {ticket.sentimentAnalysis ? (
                            <SentimentBadge analysis={ticket.sentimentAnalysis} />
                          ) : (
                            <Badge className={getSentimentColor(ticket.sentiment)}>
                              {ticket.sentiment} ({Math.round(ticket.sentimentScore * 100)}%)
                            </Badge>
                          )}
                        </div>
                      </div>

                      {ticket.sentimentAnalysis && (
                        <div className="bg-muted rounded-md p-3 space-y-2">
                          <p className="text-sm font-medium">AI Analysis:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p>
                                <strong>Emotions:</strong> {ticket.sentimentAnalysis.emotions.join(", ")}
                              </p>
                              <p>
                                <strong>Urgency:</strong> {ticket.sentimentAnalysis.urgency}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Confidence:</strong> {Math.round(ticket.sentimentAnalysis.confidence * 100)}%
                              </p>
                              <p>
                                <strong>Key phrases:</strong>{" "}
                                {ticket.sentimentAnalysis.keyPhrases.slice(0, 2).join(", ")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Created: {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                        <Button size="sm" variant={selectedTicket?.id === ticket.id ? "default" : "outline"}>
                          {selectedTicket?.id === ticket.id ? "Selected" : "Select Ticket"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Positive Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">
                    {tickets.filter((t) => t.sentiment === "positive").length}
                  </div>
                  <Progress value={33} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Neutral Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-muted-foreground">
                    {tickets.filter((t) => t.sentiment === "neutral").length}
                  </div>
                  <Progress value={33} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Negative Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {tickets.filter((t) => t.sentiment === "negative").length}
                  </div>
                  <Progress value={33} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            {selectedTicket && selectedTicket.sentimentAnalysis ? (
              <ActionRecommendations
                context={getRecommendationContext(selectedTicket)!}
                onActionExecuted={(recId, stepId) => {
                  console.log(`Action executed: ${recId} - ${stepId}`)
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Ticket</CardTitle>
                  <CardDescription>
                    Choose a ticket from the Ticket Analysis tab to see AI-generated action recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Action recommendations will appear here once you select a ticket with completed sentiment analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                  <CardDescription>Monitor the status of your Freshdesk GPT agent integrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${integrationStatus.freshdesk ? "bg-accent" : "bg-destructive"}`}
                        />
                        <div>
                          <div className="font-medium">Freshdesk API</div>
                          <div className="text-sm text-muted-foreground">
                            {integrationStatus.freshdesk ? "Connected" : "Disconnected"}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${integrationStatus.gpt ? "bg-accent" : "bg-destructive"}`}
                        />
                        <div>
                          <div className="font-medium">GPT Analysis Engine</div>
                          <div className="text-sm text-muted-foreground">
                            {integrationStatus.gpt ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${integrationStatus.operationsManual ? "bg-accent" : "bg-destructive"}`}
                        />
                        <div>
                          <div className="font-medium">Operations Manual</div>
                          <div className="text-sm text-muted-foreground">
                            {integrationStatus.operationsManual ? "Loaded" : "Not configured"}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Upload Manual
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <ManualUpload
                  onUploadComplete={(manual) => {
                    setIntegrationStatus((prev) => ({ ...prev, operationsManual: true }))
                  }}
                />

                {integrationStatus.operationsManual && selectedTicket && (
                  <ManualSearch
                    manualId="manual-default"
                    ticketContext={
                      selectedTicket
                        ? {
                            subject: selectedTicket.subject,
                            description: selectedTicket.description || "",
                            sentiment: selectedTicket.sentiment,
                            urgency: selectedTicket.sentimentAnalysis?.urgency || "medium",
                          }
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
