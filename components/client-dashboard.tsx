"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, Building, Calendar, Euro, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  categorieOpera: { id: string; descrizione: string; id_categoria: string }[]
  categorie: { id: string; descrizione: string }[]
  criteriAggiudicazione: { id: string; descrizione: string }[] // Aggiunto
  currentPage: number
  totalItems: number
  pageSize: number
}

export function ClientDashboard({ 
  initialTenders, 
  categorieOpera, 
  categorie,
  criteriAggiudicazione, // Aggiungere questa riga
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
  // Filter State
  const [filters, setFilters] = useState({
    categoriaOpera: "all",
    soloPrevalente: false,
    categoria: "all",
    stato: "all",
    startDate: "",
    endDate: "",
    minValue: "",
    maxValue: "",
    criterioAggiudicazione: "all",
  });
  
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

    // Apply categoriaOpera filter
    if (filters.categoriaOpera !== "all") {
      result = result.filter((tender) => {
        if (!tender.categorieOpera || tender.categorieOpera.length === 0) {
          return false
        }
        
        // Se il flag soloPrevalente è attivo, filtra solo le categorie prevalenti
        if (filters.soloPrevalente) {
          return tender.categorieOpera.some(
            (cat) => cat.id_categoria === filters.categoriaOpera && cat.cod_tipo_categoria === "P"
          )
        } else {
          // Altrimenti filtra tutte le categorie (prevalenti e scorporabili)
          return tender.categorieOpera.some((cat) => cat.id_categoria === filters.categoriaOpera)
        }
      })
    }

    // Apply categoria filter (ora natura bando)
    if (filters.categoria !== "all") {
      const categoriaMap: Record<string, string> = {
        "1": "Lavori",
        "2": "Forniture",
        "3": "Servizi",
      }
      const targetCategory = categoriaMap[filters.categoria]
      result = result.filter((tender) => tender.naturaPrincipale === targetCategory)
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
      filters.categoriaOpera !== "all" ||
      filters.soloPrevalente !== false ||
      filters.categoria !== "all" ||
      filters.stato !== "all" ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.minValue !== "" ||
      filters.maxValue !== "" ||
      filters.criterioAggiudicazione !== "all"
    )
  }, [searchQuery, filters])

  // Handle search
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Costruiamo i parametri di query
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1'); // Torniamo alla prima pagina
    
    if (searchQuery.trim()) {
      queryParams.append('searchQuery', searchQuery.trim());
    }
    
    // Aggiungiamo anche gli altri filtri attivi
    if (filters.categoriaOpera !== 'all') {
      queryParams.append('categoriaOpera', filters.categoriaOpera);
    }
    
    if (filters.soloPrevalente) {
      queryParams.append('soloPrevalente', 'true');
    }
    
    if (filters.categoria !== 'all') {
      queryParams.append('categoria', filters.categoria);
    }
    
    if (filters.stato !== 'all') {
      queryParams.append('stato', filters.stato);
    }
    
    if (filters.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    
    if (filters.endDate) {
      queryParams.append('endDate', filters.endDate);
    }
    
    if (filters.minValue) {
      queryParams.append('minValue', filters.minValue);
    }
    
    if (filters.maxValue) {
      queryParams.append('maxValue', filters.maxValue);
    }

    if (filters.criterioAggiudicazione !== 'all') {
      queryParams.append('criterioAggiudicazione', filters.criterioAggiudicazione);
    }  
    
    // Navighiamo alla stessa pagina ma con i nuovi parametri di query
    router.push(`${pathname}?${queryParams.toString()}`);
  }

  // Handle temporary filter changes (while editing)
  const updateTempFilter = (key: string, value: string | boolean | number) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Apply filters (when user clicks "Applica Filtri")
  const applyFilters = () => {
    // Aggiorniamo lo stato locale
    setFilters(tempFilters)
    
    // Costruiamo i parametri di query per i filtri
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1'); // Torniamo alla prima pagina
    
    // Aggiungiamo solo i filtri che hanno un valore
    if (tempFilters.categoriaOpera !== 'all') {
      queryParams.append('categoriaOpera', tempFilters.categoriaOpera);
    }
    
    if (tempFilters.soloPrevalente) {
      queryParams.append('soloPrevalente', 'true');
    }
    
    if (tempFilters.categoria !== 'all') {
      queryParams.append('categoria', tempFilters.categoria);
    }
    
    if (tempFilters.stato !== 'all') {
      queryParams.append('stato', tempFilters.stato);
    }
    
    if (tempFilters.startDate) {
      queryParams.append('startDate', tempFilters.startDate);
    }
    
    if (tempFilters.endDate) {
      queryParams.append('endDate', tempFilters.endDate);
    }
    
    if (tempFilters.minValue) {
      queryParams.append('minValue', tempFilters.minValue);
    }
    
    if (tempFilters.maxValue) {
      queryParams.append('maxValue', tempFilters.maxValue);
    }

    if (tempFilters.criterioAggiudicazione !== 'all') {
      queryParams.append('criterioAggiudicazione', tempFilters.criterioAggiudicazione);
    }
    
    if (searchQuery.trim()) {
      queryParams.append('searchQuery', searchQuery.trim());
    }
    
    // Navighiamo alla stessa pagina ma con i nuovi parametri di query
    router.push(`${pathname}?${queryParams.toString()}`);
  }

  // Reset all filters
  // Reset all filters
  const resetFilters = () => {
    const resetState = {
      categoriaOpera: "all",
      soloPrevalente: false,
      categoria: "all",
      stato: "all",
      startDate: "",
      endDate: "",
      minValue: "",
      maxValue: "",
      criteriAggiudicazione: "all",
    }
    setFilters(resetState)
    setTempFilters(resetState)
    setSearchQuery("")
    
    // Navighiamo alla pagina senza filtri
    router.push(pathname);
  }

  // When opening filters, sync temp filters with current filters
  const toggleFilters = () => {
    if (!showFilters) {
      setTempFilters(filters)
    }
    setShowFilters(!showFilters)
  }

  // Calculate total pages (move this before the return statement)
  const totalPages = Math.ceil(totalItems / pageSize)
  
  // Function to change page (move this before the return statement)
  // Function to change page
  const changePage = (page: number) => {
  // Costruiamo i parametri di query
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  
  // Aggiungiamo i filtri attivi
  if (searchQuery.trim()) {
    queryParams.append('searchQuery', searchQuery.trim());
  }
  
  if (filters.categoriaOpera !== 'all') {
    queryParams.append('categoriaOpera', filters.categoriaOpera);
  }
  
  if (filters.soloPrevalente) {
    queryParams.append('soloPrevalente', 'true');
  }
  
  if (filters.categoria !== 'all') {
    queryParams.append('categoria', filters.categoria);
  }
  
  if (filters.stato !== 'all') {
    queryParams.append('stato', filters.stato);
  }
  
  if (filters.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  
  if (filters.minValue) {
    queryParams.append('minValue', filters.minValue);
  }
  
  if (filters.maxValue) {
    queryParams.append('maxValue', filters.maxValue);
  }
  
  // In handleSearch, applyFilters e changePage
  if (filters.criterioAggiudicazione !== 'all') {
  queryParams.append('criterioAggiudicazione', filters.criterioAggiudicazione);
  }
  
  router.push(`${pathname}?${queryParams.toString()}`);
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
                  <Activity size={16} className="mr-2" />
                  Categoria Opera
                </label>
                <Select value={tempFilters.categoriaOpera} onValueChange={(value) => updateTempFilter("categoriaOpera", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {categorieOpera.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id_categoria}>
                        {cat.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="soloPrevalente"
                    checked={tempFilters.soloPrevalente}
                    onChange={(e) => updateTempFilter("soloPrevalente", e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="soloPrevalente" className="text-sm text-gray-700">
                    Solo come prevalente
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Activity size={16} className="mr-2" />
                  Settore
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

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium">
                  <Activity size={16} className="mr-2" />
                  Criterio di Aggiudicazione
                </label>
                <Select value={tempFilters.criterioAggiudicazione} onValueChange={(value) => updateTempFilter("criterioAggiudicazione", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {criteriAggiudicazione.map((criterio) => (
                      <SelectItem key={criterio.id} value={criterio.id}>
                        {criterio.descrizione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          {filters.categoriaOpera !== "all" && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Categoria Opera: {categorieOpera.find((c) => c.id === filters.categoriaOpera)?.descrizione || filters.categoriaOpera}
              {filters.soloPrevalente && " (solo prevalente)"}
            </span>
          )}
          {filters.categoria !== "all" && (
            <Badge variant="outline" className="mr-2">
              Natura Bando: {categorie.find((c) => c.id === filters.categoria)?.descrizione || filters.categoria}
            </Badge>
          )}
          {filters.stato !== "all" && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
              Stato: {filters.stato}
            </span>
          )}
          {filters.criterioAggiudicazione !== "all" && (
            <Badge variant="outline" className="mr-2">
              Criterio: {criteriAggiudicazione.find((c) => c.id === filters.criterioAggiudicazione)?.descrizione || filters.criterioAggiudicazione}
            </Badge>
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
      {/*<div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Trovate {filteredTenders.length} gare d&apos;appalto
          {initialTenders.length !== filteredTenders.length && (
            <span className="text-blue-600"> su {initialTenders.length} totali</span>
          )}
        </div>
      </div>*/}
      
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
            
            {/* Indicatore del numero totale di pagine */}
            <PaginationItem>
              <span className="flex items-center justify-center h-9 px-2 text-sm text-gray-500">
                di {totalPages}
              </span>
            </PaginationItem>
            
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
