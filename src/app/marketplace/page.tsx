'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Therapist, Chat, TherapistApplication } from '@/lib/types';
import TherapistFilters from '@/components/marketplace/therapist-filters';
import TherapistList from '@/components/marketplace/therapist-list';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, Route } from 'lucide-react';
import TherapistEditModal from '@/components/marketplace/therapist-edit-modal';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApplicationList from '@/components/admin/application-list';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketplacePage() {
  const { user, userRoles, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const isAdmin = userRoles?.includes('admin') ?? false;

  const [filters, setFilters] = useState({
    specialty: '',
    language: '',
    priceRange: [0, 200],
  });

  const [editingTherapist, setEditingTherapist] = useState<Therapist | null | 'new'>(null);

  const handleSaveTherapist = (therapistData: Therapist) => {
    // This function will be handled by Firestore listeners automatically updating the UI
    setEditingTherapist(null);
  };
  
  const openEditModal = (therapist: Therapist | 'new') => {
    setEditingTherapist(therapist);
  };

  // --- Data Fetching ---
  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`)) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const therapistsQuery = useMemo(
    () => (firestore ? query(collection(firestore, 'therapists'), where('published', '==', true)) : undefined),
    [firestore]
  );
  const { data: therapists, loading: therapistsLoading } = useCollection<Therapist>(therapistsQuery);
  
  const applicationsQuery = useMemo(
    () => (isAdmin && firestore ? query(collection(firestore, 'therapistApplications'), orderBy('submittedAt', 'desc')) : undefined),
    [isAdmin, firestore]
  );
  const { data: applications, loading: applicationsLoading } = useCollection<TherapistApplication>(applicationsQuery);

  // --- Filtering and Memoization ---
  const filteredTherapists = useMemo(() => {
    if (!therapists) return [];
    return therapists.filter((therapist) => {
      const { specialty, language, priceRange } = filters;
      const [minPrice, maxPrice] = priceRange;

      const specialtyMatch = !specialty || therapist.specialties.map((s) => s.toLowerCase()).includes(specialty.toLowerCase());
      const languageMatch = !language || therapist.languages.map((l) => l.toLowerCase()).includes(language.toLowerCase());
      const priceMatch = therapist.pricePerSession >= minPrice && therapist.pricePerSession <= maxPrice;

      return specialtyMatch && languageMatch && priceMatch;
    });
  }, [therapists, filters]);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const { allSpecialties, allLanguages } = useMemo(() => {
    const specialties = new Set<string>();
    const languages = new Set<string>();
    therapists?.forEach((t) => {
      t.specialties.forEach((s) => specialties.add(s));
      t.languages.forEach((l) => languages.add(l));
    });
    return {
      allSpecialties: Array.from(specialties).filter(Boolean),
      allLanguages: Array.from(languages).filter(Boolean),
    };
  }, [therapists]);

  const isLoading = authLoading || therapistsLoading;

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
          <aside className="w-72 border-r bg-card/30 flex-shrink-0 hidden md:block overflow-y-auto">
            <TherapistFilters
              specialties={allSpecialties}
              languages={allLanguages}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </aside>
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b p-4 sm:p-6 z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                <div className='flex items-center gap-2'>
                  <Button asChild variant="ghost" size="icon" className='-ml-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground'>
                    <Link href="/">
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {isAdmin ? 'Portal de Administración' : 'Encuentra tu Terapeuta'}
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {isAdmin ? (
                <Tabs defaultValue="applications" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="therapists">Terapeutas</TabsTrigger>
                    <TabsTrigger value="applications">
                      Solicitudes
                      {applications && applications.filter(a => a.status === 'pending').length > 0 && 
                        <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                          {applications.filter(a => a.status === 'pending').length}
                        </span>
                      }
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="therapists">
                     <TherapistList therapists={filteredTherapists} onEdit={openEditModal} isAdmin={isAdmin} isLoading={isLoading} />
                  </TabsContent>
                  <TabsContent value="applications">
                     <ApplicationList applications={applications || []} isLoading={applicationsLoading} />
                  </TabsContent>
                </Tabs>
              ) : (
                <TherapistList therapists={filteredTherapists} onEdit={openEditModal} isAdmin={isAdmin} isLoading={isLoading} />
              )}
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
