"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api"
import type { LoginRequest, RegisterRequest } from "@/lib/api"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in (only on client side)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        apiClient.setToken(token)
        setIsAuthenticated(true)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiClient.login(credentials)
      
      // Check if login was successful - API returns 2110 for success
      if (response.statusCode === 2110 && response.data?.token) {
        localStorage.setItem("token", response.data.token)
        apiClient.setToken(response.data.token)
        setIsAuthenticated(true)
      } else {
        // Handle error cases
        throw new Error(response.errorMessage || response.message || "Login failed")
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Login failed")
    }
  }

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await apiClient.register(userData)
      
      // Check if registration was successful - API returns 2110 for success
      if (response.statusCode === 2110) {
        // Registration successful, but don't set authentication
        // User should login separately
        return
      } else {
        // Handle specific error cases
        const errorMessage = response.errorMessage || response.message
        if (errorMessage?.includes("email")) {
          throw new Error("Email already registered")
        } else if (errorMessage?.includes("username")) {
          throw new Error("Username already taken")
        } else {
          throw new Error(errorMessage || "Registration failed")
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Registration failed")
    }
  }

  const logout = () => {
    apiClient.clearToken()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
