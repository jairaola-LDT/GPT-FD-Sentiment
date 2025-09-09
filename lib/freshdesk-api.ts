export interface FreshdeskConfig {
  domain: string
  apiKey: string
}

export interface FreshdeskTicket {
  id: number
  subject: string
  description: string
  status: number
  priority: number
  requester_id: number
  created_at: string
  updated_at: string
  custom_fields: Record<string, any>
}

export class FreshdeskAPI {
  private config: FreshdeskConfig
  private baseUrl: string

  constructor(config: FreshdeskConfig) {
    this.config = config
    this.baseUrl = `https://${config.domain}.freshdesk.com/api/v2`
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      Authorization: `Basic ${btoa(this.config.apiKey + ":X")}`,
      "Content-Type": "application/json",
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getTickets(params: Record<string, string> = {}): Promise<FreshdeskTicket[]> {
    const queryString = new URLSearchParams(params).toString()
    const endpoint = `/tickets${queryString ? `?${queryString}` : ""}`
    return this.makeRequest(endpoint)
  }

  async getTicket(ticketId: number): Promise<FreshdeskTicket> {
    return this.makeRequest(`/tickets/${ticketId}`)
  }

  async updateTicket(ticketId: number, updates: Partial<FreshdeskTicket>): Promise<FreshdeskTicket> {
    return this.makeRequest(`/tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  async createNote(ticketId: number, body: string, isPrivate = false) {
    return this.makeRequest(`/tickets/${ticketId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        body,
        private: isPrivate,
      }),
    })
  }
}

// Webhook handler for real-time ticket updates
export async function handleFreshdeskWebhook(payload: any) {
  // Process incoming webhook from Freshdesk
  console.log("Received Freshdesk webhook:", payload)

  // This would trigger sentiment analysis and action recommendation
  // when new tickets are created or updated
  return { success: true }
}
