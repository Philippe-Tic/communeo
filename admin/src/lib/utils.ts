import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

export function getMediaUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_URL}${url}`
}
