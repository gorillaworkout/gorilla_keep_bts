const API_BASE_URL = "http://94.74.86.174:8080/api"

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  data: {
    token: string
  }
}

export interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Get token from localStorage if available
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<{ token: string }>("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
    return { data: response.data }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<{ token: string }>("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
    return { data: response.data }
  }

  async getAllChecklists(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>("/checklist")
  }

  async saveChecklist(checklist: any): Promise<ApiResponse<any>> {
    return this.request<any>("/checklist", {
      method: "POST",
      body: JSON.stringify(checklist),
    })
  }

  async updateChecklist(checklistId: string, updates: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  async deleteChecklist(checklistId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}`, {
      method: "DELETE",
    })
  }

  async getChecklist(checklistId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}`)
  }

  async getChecklistItems(checklistId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/checklist/${checklistId}/item`)
  }

  async saveChecklistItem(checklistId: string, item: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}/item`, {
      method: "POST",
      body: JSON.stringify(item),
    })
  }

  async getItemById(checklistId: string, itemId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}/item/${itemId}`)
  }

  async updateItemStatus(checklistId: string, itemId: string, status: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}/item/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(status),
    })
  }

  async deleteItem(checklistId: string, itemId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}/item/${itemId}`, {
      method: "DELETE",
    })
  }

  async renameItem(checklistId: string, itemId: string, newName: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/checklist/${checklistId}/item/rename/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
