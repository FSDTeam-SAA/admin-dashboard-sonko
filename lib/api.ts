"use client"

import axios, { type AxiosError, type AxiosRequestConfig } from "axios"
import { getSession } from "next-auth/react"
import { API_BASE_URL } from "@/lib/api-base"

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
  statusCode?: number
}

export type UserAvatar = {
  public_id?: string
  url?: string
}

export type UserAddress = {
  street?: string
  city?: string
  state?: string
  zipCode?: string
}

export type UserVerificationInfo = {
  verified?: boolean
  token?: string
}

export type User = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  avatar?: UserAvatar
  address?: UserAddress
  verificationInfo?: UserVerificationInfo
}

export type AuthLoginPayload = {
  email: string
  password: string
}

export type AuthLoginData = {
  accessToken: string
  refreshToken: string
  role: string
  _id: string
  user: User
}

export type Country = {
  _id: string
  title: string
  alphaChar?: string
  countryCode?: string
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

export type Service = {
  _id: string
  title: string
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

export type Transaction = {
  _id: string
  amount: number
  type?: string
  status?: string
  from?: string
  to?: string
  flag?: "received" | "delivered"
  createdAt?: string
  user?: User
  userTo?: User
}

export type AdminSetting = {
  _id: string
  transactionType: string
  percentage: number
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export type KycPayload = {
  userId?: string
  documentType?: string
  documentNumber?: string
}

export type CardPayload = {
  cardNumber?: string
  expiry?: string
  cvv?: string
  nameOnCard?: string
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  const accessToken = session?.accessToken
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const session = await getSession()
      const accessToken = session?.accessToken
      if (accessToken) {
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      }
    }
    return Promise.reject(error)
  }
)

export const authLogin = async (payload: AuthLoginPayload) => {
  const { data } = await api.post<ApiResponse<AuthLoginData>>("/auth/login", payload)
  return data
}

export const authVerifyEmail = async (payload: { email: string; otp: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/verify", payload)
  return data
}

export const authForgetPassword = async (payload: { email: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/forget", payload)
  return data
}

export const authVerifyOtp = async (payload: { email: string; otp: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/verify-otp", payload)
  return data
}

export const authResetPassword = async (payload: { email: string; otp: string; password: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/reset-password", payload)
  return data
}

export const authChangePassword = async (payload: { oldPassword: string; newPassword: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/change-password", payload)
  return data
}

export const authRefreshToken = async (payload: { refreshToken: string }) => {
  const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
    "/auth/refresh-token",
    payload
  )
  return data
}

export const authLogout = async () => {
  const { data } = await api.post<ApiResponse<unknown>>("/auth/logout")
  return data
}

export const getProfile = async () => {
  const { data } = await api.get<ApiResponse<User>>("/user/profile")
  return data
}

export const updateProfile = async (payload: FormData) => {
  const { data } = await api.patch<ApiResponse<User>>("/user/update-profile", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const userChangePassword = async (payload: { oldPassword: string; newPassword: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/user/change-password", payload)
  return data
}

export const getTransactions = async () => {
  const { data } = await api.get<ApiResponse<Transaction[]>>("/transaction")
  return data
}

export const sendMoney = async (payload: { userTo: string; amount: number; password: string }) => {
  const { data } = await api.post<ApiResponse<Transaction>>("/transaction/send", payload)
  return data
}

export const cashOut = async (payload: { userTo: string; amount: number; password: string }) => {
  const { data } = await api.post<ApiResponse<Transaction>>("/transaction/cash-out", payload)
  return data
}

export const cardToCard = async (payload: { cardA: string; cardB: string; amount: number }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/transaction/card-to-card", payload)
  return data
}

export const startKyc = async (payload: KycPayload) => {
  const { data } = await api.post<ApiResponse<unknown>>("/kyc/start", payload)
  return data
}

export const uploadKycDocument = async (payload: FormData) => {
  const { data } = await api.post<ApiResponse<unknown>>("/kyc/upload-document", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const uploadKycSelfie = async (payload: FormData) => {
  const { data } = await api.post<ApiResponse<unknown>>("/kyc/upload-selfie", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const submitKyc = async (payload: { userId?: string }) => {
  const { data } = await api.post<ApiResponse<unknown>>("/kyc/submit", payload)
  return data
}

export const updateKycStatus = async (payload: { kycId: string; status: string }) => {
  const { data } = await api.put<ApiResponse<unknown>>("/kyc/update-status", payload)
  return data
}

export const getCards = async () => {
  const { data } = await api.get<ApiResponse<unknown[]>>("/card")
  return data
}

export const createCard = async (payload: CardPayload) => {
  const { data } = await api.post<ApiResponse<unknown>>("/card", payload)
  return data
}

export const updateCard = async (id: string, payload: CardPayload) => {
  const { data } = await api.put<ApiResponse<unknown>>(`/card/${id}`, payload)
  return data
}

export const deleteCard = async (id: string) => {
  const { data } = await api.delete<ApiResponse<unknown>>(`/card/${id}`)
  return data
}

export const getCountries = async () => {
  const { data } = await api.get<ApiResponse<Country[]>>("/country")
  return data
}

export const createCountry = async (payload: FormData) => {
  const { data } = await api.post<ApiResponse<Country>>("/country", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const updateCountry = async (id: string, payload: FormData) => {
  const { data } = await api.put<ApiResponse<Country>>(`/country/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const deleteCountry = async (id: string) => {
  const { data } = await api.delete<ApiResponse<Country>>(`/country/${id}`)
  return data
}

export const getServices = async () => {
  const { data } = await api.get<ApiResponse<Service[]>>("/service")
  return data
}

export const createService = async (payload: FormData) => {
  const { data } = await api.post<ApiResponse<Service>>("/service", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const updateService = async (id: string, payload: FormData) => {
  const { data } = await api.put<ApiResponse<Service>>(`/service/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export const deleteService = async (id: string) => {
  const { data } = await api.delete<ApiResponse<Service>>(`/service/${id}`)
  return data
}

export const getAdminSettings = async () => {
  const { data } = await api.get<ApiResponse<AdminSetting[]>>("/admin-setting")
  return data
}

export const setAdminSetting = async (payload: { transactionType: string; percentage: number; updatedBy?: string }) => {
  const { data } = await api.post<ApiResponse<AdminSetting>>("/admin-setting/set", payload)
  return data
}
