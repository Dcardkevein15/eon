'use client';

import type { TherapistApplication } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import ApplicationCard from './application-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApplicationListProps {
  applications: TherapistApplication[];
  isLoading: boolean;
}

export default function ApplicationList({ applications, isLoading }: ApplicationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  
  const pending = applications.filter(a => a.status === 'pending');
  const approved = applications.filter(a => a.status === 'approved');
  const rejected = applications.filter(a => a.status === 'rejected');

  const renderList = (apps: TherapistApplication[], emptyMessage: string) => {
    if (apps.length === 0) {
      return <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>;
    }
    return (
      <div className="space-y-4">
        {apps.map(app => <ApplicationCard key={app.id} application={app} />)}
      </div>
    );
  }

  return (
     <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
        <TabsTrigger value="approved">Aprobadas ({approved.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rechazadas ({rejected.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        {renderList(pending, "No hay solicitudes pendientes.")}
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        {renderList(approved, "No hay solicitudes aprobadas.")}
      </TabsContent>
      <TabsContent value="rejected" className="mt-4">
        {renderList(rejected, "No hay solicitudes rechazadas.")}
      </TabsContent>
    </Tabs>
  );
}
