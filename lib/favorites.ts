"use client"

const FAVORITES_KEY = "appalti-preferiti"

export function getFavorites(): string[] {
  if (typeof window === "undefined") return []

  const favorites = localStorage.getItem(FAVORITES_KEY)
  return favorites ? JSON.parse(favorites) : []
}

export function toggleFavorite(tenderId: string): void {
  if (typeof window === "undefined") return

  const favorites = getFavorites()
  const index = favorites.indexOf(tenderId)

  if (index === -1) {
    favorites.push(tenderId)
  } else {
    favorites.splice(index, 1)
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
}

export function isFavorite(tenderId: string): boolean {
  if (typeof window === "undefined") return false

  const favorites = getFavorites()
  return favorites.includes(tenderId)
}
