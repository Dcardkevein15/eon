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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import TherapistEditModal from '@/components/marketplace/therapist-edit-modal';

export default function MarketplacePage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const isAdmin = true; // Placeholder for admin role check

  const [therapists, setTherapists] = useState<Therapist[]>(THERAPISTS_DATA);
  const [filters, setFilters] = useState({
    specialty: '',
    language: '',
    priceRange: [0, 100],
  });

  const [editingTherapist, setEditingTherapist] = useState<Therapist | null | 'new'>(null);

  const handleSaveTherapist = (therapistData: Therapist) => {
    // In a real app, this would call a backend API
    if (editingTherapist === 'new') {
      // Create new therapist
      const newTherapist = { ...therapistData, id: Date.now().toString(), reviewsCount: 0, rating: 0 };
      setTherapists(prev => [newTherapist, ...prev]);
    } else {
      // Update existing therapist
      setTherapists(prev => prev.map(t => t.id === therapistData.id ? therapistData : t));
    }
    setEditingTherapist(null); // Close modal
  };

  const openEditModal = (therapist: Therapist | 'new') => {
    setEditingTherapist(therapist);
  };


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
    <div className="flex">
      <SidebarProvider>
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
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className='flex-1 flex'>
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
                          <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-bold tracking-tight">
                                Encuentra tu terapeuta ideal
                            </h1>
                            {isAdmin && (
                                <Button onClick={() => openEditModal('new')}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Agregar profesional
                                </Button>
                            )}
                          </div>
                        <TherapistList therapists={filteredTherapists} onEdit={openEditModal} isAdmin={isAdmin} />
                        </div>
                    </div>
                </div>
            </main>
        </SidebarInset>
        {editingTherapist && (
          <TherapistEditModal
            therapist={editingTherapist === 'new' ? null : editingTherapist}
            isOpen={!!editingTherapist}
            onClose={() => setEditingTherapist(null)}
            onSave={handleSaveTherapist}
          />
        )}
      </SidebarProvider>
    </div>
  );
}

    