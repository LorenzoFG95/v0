"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, Building, Calendar, Euro, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TenderList } from "@/components/tender-list"
import type { Tender } from "@/lib/types"
import { useRouter, usePathname } from "next/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface ClientDashboardProps {
  initialTenders: Tender[]
  entiAppaltanti: { id: string; nome: string }[]
  categorie: { id: string; descrizione: string }[]
  currentPage: number
  totalItems: number
  pageSize: number
}

export function ClientDashboard({ 
  initialTenders, 
  entiAppaltanti, 
  categorie,
  currentPage,
  totalItems,
  pageSize
}: ClientDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // UI State
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter State
  const [filters, setFilters] = useState({
    ente: "all",
    categoria: "all",
    stato: "all",
    startDate: "",
    endDate: "",
    minValue: "",
    maxValue: "",
  })

  // Temporary filter state (for when user is editing filters but hasn't applied them yet)
  const [tempFilters, setTempFilters] = useState(filters)

  // Filter the tenders based on current applied filters and search
  const filteredTenders = useMemo(() => {
    let result = [...initialTenders]

    // Apply search filter (including CIG)
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      result = result.filter(
        (tender) =>
          tender.titolo.toLowerCase().includes(searchLower) ||
          tender.descrizione.toLowerCase().includes(searchLower) ||
          tender.stazioneAppaltante.nome.toLowerCase().includes(searchLower) ||
          (tender.cig && tender.cig.toLowerCase().includes(searchLower)),
      )
    }

    // Apply ente filter
    if (filters.ente !== "all") {
      result = result.filter((tender) => tender.stazioneAppaltante.id === filters.ente)
    }

    // Apply categoria filter
    if (filters.categoria !== "all") {
      const categoriaMap: Record<string, string> = {
        "1": "Lavori",
        "2": "Forniture",
        "3": "Servizi",
      }
      const targetCategory = categoriaMap[filters.categoria]
      result = result.filter((tender) => tender.categoria === targetCategory)
    }

    // Apply stato filter
    if (filters.stato !== "all") {
      const statoMap: Record<string, string> = {
        active: "In corso",
        complete: "Conclusa",
        planning: "Pianificazione",
      }
      const targetStato = statoMap[filters.stato]
      result = result.filter((tender) => tender.planificazione === targetStato)
    }

    // Apply date filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      result = result.filter((tender) => {
        const tenderDate = new Date(tender.pubblicazione)
        return tenderDate >= startDate
      })
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      result = result.filter((tender) => {
        const tenderDate = new Date(tender.pubblicazione)
        return tenderDate <= endDate
      })
    }

    // Apply value filters
    if (filters.minValue) {
      const minValue = Number.parseFloat(filters.minValue)
      if (!Number.isNaN(minValue)) {
        result = result.filter((tender) => tender.valore >= minValue)
      }
    }

    if (filters.maxValue) {
      const maxValue = Number.parseFloat(filters.maxValue)
      if (!Number.isNaN(maxValue)) {
        result = result.filter((tender) => tender.valore <= maxValue)
      }
    }

    return result
  }, [initialTenders, searchQuery, filters])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      filters.ente !== "all" ||
      filters.categoria !== "all" ||
      filters.stato !== "all" ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.minValue !== "" ||
      filters.maxValue !== ""
    )
  }, [searchQuery, filters])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is handled automatically by the useMemo above
  }

  // Handle temporary filter changes (while editing)
  const updateTempFilter = (key: string, value: string) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Apply filters (when user clicks "Applica Filtri")
  const applyFilters = () => {
    setFilters(tempFilters)
  }

  // Reset all filters
  const resetFilters = () => {
    const resetState = {
      ente: "all",
      categoria: "all",
      stato: "all",
      startDate: "",
      endDate: "",
      minValue: "",
      maxValue: "",
    }
    setFilters(resetState)
    setTempFilters(resetState)
    setSearchQuery("")
  }

  // When opening filters, sync temp filters with current filters
  const toggleFilters = () => {
    if (!showFilters) {
      setTempFilters(filters)
    }
    setShowFilters(!showFilters)
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-md border shadow-sm">
        <form onSubmit={handleSearch} className="flex items-center p-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Cerca gare d'appalto, CIG, enti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            onClick={toggleFilters}
            className="ml-2"
          >
            <SlidersHorizontal size={18} className="mr-2" />
            Filtri
          </Button>
          <Button type="submit" className="ml-2">
            Cerca
          </Button>
        </form>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtri avanzati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Building size={16} className="mr-2" />
                  Stazione Appaltante
                </label>
                <Select value={tempFilters.ente} onValueChange={(value) => updateTempFilter("ente", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {entiAppaltanti.map((ente) => (
                      <SelectItem key={ente.id} value={ente.id}>
                        {ente.nome.length > 50 ? ente.nome.substring(0, 50) + "..." : ente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Activity size={16} className="mr-2" />
                  Categoria
                </label>
                <Select value={tempFilters.categoria} onValueChange={(value) => updateTempFilter("categoria", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {categorie.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Activity size={16} className="mr-2" />
                  Stato
                </label>
                <Select value={tempFilters.stato} onValueChange={(value) => updateTempFilter("stato", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="active">In corso</SelectItem>
                    <SelectItem value="complete">Conclusa</SelectItem>
                    <SelectItem value="planning">Programmazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Calendar size={16} className="mr-2" />
                  Data Da
                </label>
                <Input
                  type="date"
                  value={tempFilters.startDate}
                  onChange={(e) => updateTempFilter("startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Calendar size={16} className="mr-2" />
                  Data A
                </label>
                <Input
                  type="date"
                  value={tempFilters.endDate}
                  onChange={(e) => updateTempFilter("endDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Euro size={16} className="mr-2" />
                  Valore Min (€)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={tempFilters.minValue}
                  onChange={(e) => updateTempFilter("minValue", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Euro size={16} className="mr-2" />
                  Valore Max (€)
                </label>
                <Input
                  type="number"
                  placeholder="1000000"
                  value={tempFilters.maxValue}
                  onChange={(e) => updateTempFilter("maxValue", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reimposta
            </Button>
            <Button onClick={applyFilters}>Applica Filtri</Button>
          </CardFooter>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">Filtri attivi:</span>
          {searchQuery && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Ricerca: "{searchQuery}"
            </span>
          )}
          {filters.ente !== "all" && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Ente: {entiAppaltanti.find((e) => e.id === filters.ente)?.nome || filters.ente}
            </span>
          )}
          {filters.categoria !== "all" && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Categoria: {categorie.find((c) => c.id === filters.categoria)?.descrizione || filters.categoria}
            </span>
          )}
          {filters.stato !== "all" && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
              Stato: {filters.stato}
            </span>
          )}
          <button
            onClick={resetFilters}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 hover:bg-red-200"
          >
            Rimuovi tutti
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Trovate {filteredTenders.length} gare d&apos;appalto
          {initialTenders.length !== filteredTenders.length && (
            <span className="text-blue-600"> su {initialTenders.length} totali</span>
          )}
        </div>
      </div>
      
      {/* Results */}
      <TenderList tenders={filteredTenders} />
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious onClick={() => changePage(currentPage - 1)} />
              </PaginationItem>
            )}
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Logic to show pages around the current page
              let pageNum = i + 1
              if (totalPages > 5) {
                if (currentPage > 3) {
                  pageNum = currentPage - 3 + i
                }
                if (currentPage > totalPages - 2) {
                  pageNum = totalPages - 4 + i
                }
              }
              
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink 
                    isActive={pageNum === currentPage}
                    onClick={() => changePage(pageNum)}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext onClick={() => changePage(currentPage + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
