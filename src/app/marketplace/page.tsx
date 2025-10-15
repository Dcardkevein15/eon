'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Therapist } from '@/lib/types';
import TherapistFilters from '@/components/marketplace/therapist-filters';
import TherapistList from '@/components/marketplace/therapist-list';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Chat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import TherapistEditModal from '@/components/marketplace/therapist-edit-modal';
import { THERAPISTS_DATA } from '@/lib/placeholder-data';
import Link from 'next/link';


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
    // Convert comma-separated strings back to arrays before saving
    const processedData = {
      ...therapistData,
      specialties: Array.isArray(therapistData.specialties) ? therapistData.specialties : String(therapistData.specialties).split(',').map(s => s.trim()).filter(Boolean),
      languages: Array.isArray(therapistData.languages) ? therapistData.languages : String(therapistData.languages).split(',').map(l => l.trim()).filter(Boolean),
    };
  
    if (editingTherapist === 'new') {
      const newTherapist = { ...processedData, id: Date.now().toString(), reviewsCount: 0, rating: 0, photoUrl: processedData.photoUrl || 'https://picsum.photos/seed/new-therapist/200/200' };
      setTherapists(prev => [newTherapist, ...prev]);
    } else {
      setTherapists(prev => prev.map(t => t.id === processedData.id ? processedData : t));
    }
    setEditingTherapist(null);
  };
  
  const openEditModal = (therapist: Therapist | 'new') => {
    if (therapist !== 'new') {
      // Ensure arrays are converted to comma-separated strings for the form
      const therapistForForm = {
        ...therapist,
        specialties: Array.isArray(therapist.specialties) ? therapist.specialties.join(', ') : '',
        languages: Array.isArray(therapist.languages) ? therapist.languages.join(', ') : '',
      };
      setEditingTherapist(therapistForForm as unknown as Therapist);
    } else {
      setEditingTherapist('new');
    }
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
    therapists.forEach((t) => {
      if (Array.isArray(t.specialties)) {
        t.specialties.forEach((s) => specialties.add(s))
      }
    });
    return Array.from(specialties).filter(Boolean);
  }, [therapists]);

  const allLanguages = useMemo(() => {
    const languages = new Set<string>();
    therapists.forEach((t) => {
       if (Array.isArray(t.languages)) {
        t.languages.forEach((l) => languages.add(l))
       }
    });
    return Array.from(languages).filter(Boolean);
  }, [therapists]);


  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
            <ChatSidebar
                chats={chats || []}
                activeChatId={''}
                isLoading={chatsLoading}
                removeChat={() => {}}
                clearChats={() => {}}
            />
        </Sidebar>
        <SidebarInset className="flex-1 flex overflow-hidden">
             {/* Filters Sidebar */}
            <aside className="w-72 border-r bg-card/30 flex-shrink-0 hidden md:block overflow-y-auto">
                <TherapistFilters
                specialties={allSpecialties}
                languages={allLanguages}
                filters={filters}
                onFilterChange={handleFilterChange}
                />
            </aside>
    
            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b p-4 sm:p-6 z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className='flex items-center gap-2'>
                       <Button asChild variant="ghost" size="icon" className='-ml-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground'>
                            <Link href="/">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Encuentra tu Terapeuta
                        </h1>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => openEditModal('new')} className="flex-shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Profesional
                        </Button>
                    )}
                  </div>
                </div>
                {/* Therapist List */}
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                  <TherapistList therapists={filteredTherapists} onEdit={openEditModal} isAdmin={isAdmin} />
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
      </div>
    </SidebarProvider>
  );
}
