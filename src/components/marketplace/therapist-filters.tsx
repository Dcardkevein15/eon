'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface Filters {
  specialty: string;
  language: string;
  priceRange: number[];
}

interface TherapistFiltersProps {
  specialties: string[];
  languages: string[];
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
}

export default function TherapistFilters({
  specialties,
  languages,
  filters,
  onFilterChange,
}: TherapistFiltersProps) {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Filtros</h3>
      </div>
      <div className="space-y-4">
        {/* Specialty Filter */}
        <div>
          <Label htmlFor="specialty">Especialidad</Label>
          <Select
            value={filters.specialty}
            onValueChange={(value) => onFilterChange({ specialty: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="specialty">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las especialidades</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Filter */}
        <div>
          <Label htmlFor="language">Idioma</Label>
          <Select
            value={filters.language}
            onValueChange={(value) => onFilterChange({ language: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Cualquier idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier idioma</SelectItem>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Filter */}
        <div>
          <Label>Rango de Precios</Label>
          <div className="mt-2">
            <Slider
              min={0}
              max={100}
              step={5}
              value={filters.priceRange}
              onValueChange={(value) => onFilterChange({ priceRange: value })}
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
