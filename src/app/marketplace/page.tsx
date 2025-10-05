'use client';

import { useState, useMemo, useCallback } from 'react';
import { THERAPISTS_DATA } from '@/lib/placeholder-data';
import type { Therapist } from '@/lib/types';
import TherapistFilters from '@/components/marketplace/therapist-filters';
import TherapistList from '@/components/marketplace/therapist-list';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Chat } from '@/lib/types';

export default function MarketplacePage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const [therapists] = useState<Therapist[]>(THERAPISTS_DATA);
  const [filters, setFilters] = useState({
    specialty: '',
    language: '',
    priceRange: [0, 100],
  });

  // Dummy chat data and functions to make the sidebar work
  const chatsQuery = useMemo(
    () =>
      user?.uid && firestore
        ? query(collection(firestore, `users/${user.uid}/chats`))
        : undefined,
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const filteredTherapists = useMemo(() => {
    return therapists.filter((therapist) => {
      const { specialty, language, priceRange } = filters;
      const [minPrice, maxPrice] = priceRange;

      const specialtyMatch =
        !specialty ||
        therapist.specialties
          .map((s) => s.toLowerCase())
          .includes(specialty.toLowerCase());
      const languageMatch =
        !language ||
        therapist.languages
          .map((l) => l.toLowerCase())
          .includes(language.toLowerCase());
      const priceMatch =
        therapist.pricePerSession >= minPrice &&
        therapist.pricePerSession <= maxPrice;

      return specialtyMatch && languageMatch && priceMatch;
    });
  }, [therapists, filters]);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const allSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    therapists.forEach((t) => t.specialties.forEach((s) => specialties.add(s)));
    return Array.from(specialties);
  }, [therapists]);

  const allLanguages = useMemo(() => {
    const languages = new Set<string>();
    therapists.forEach((t) => t.languages.forEach((l) => languages.add(l)));
    return Array.from(languages);
  }, [therapists]);


  return (
    <SidebarProvider>
      <div className="bg-background text-foreground">
        <Sidebar>
            <ChatSidebar
                chats={chats || []}
                activeChatId={''}
                isLoading={chatsLoading}
                removeChat={() => {}}
                clearChats={() => {}}
            />
        </Sidebar>
        <SidebarInset>
            <main className="flex h-screen overflow-hidden">
            {/* Filters Sidebar */}
            <div className="w-72 border-r bg-card flex-shrink-0 h-full overflow-y-auto">
                <TherapistFilters
                specialties={allSpecialties}
                languages={allLanguages}
                filters={filters}
                onFilterChange={handleFilterChange}
                />
            </div>
    
            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6">
                <h1 className="text-2xl font-bold tracking-tight mb-4">
                    Encuentra tu terapeuta ideal
                </h1>
                <TherapistList therapists={filteredTherapists} />
                </div>
            </div>
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
