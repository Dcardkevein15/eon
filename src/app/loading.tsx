import { Skeleton } from '@/components/ui/skeleton';
import { PanelLeft } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72 h-screen fixed top-0 left-0 z-40 p-2">
        <div className="flex items-center justify-between p-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-32 h-6" />
            </div>
        </div>
        <div className="p-2">
            <Skeleton className="w-full h-10" />
        </div>
        <div className='px-4 pt-4 pb-2'>
            <Skeleton className="w-24 h-4" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-2 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
        <div className='p-2 border-t border-sidebar-border'>
            <Skeleton className="w-full h-12" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 transition-[margin-left] duration-300 ml-0 md:ml-72 flex flex-col h-screen">
         <header className="flex h-14 items-center justify-start p-2 md:p-4 border-b">
            <div className='flex items-center gap-2'>
                <PanelLeft className="h-5 w-5 block md:hidden" />
                <Skeleton className="w-32 h-6" />
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
            <div className="max-w-4xl w-full flex flex-col items-center justify-center pt-12 md:pt-0">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-64 h-8 mt-4" />
                <Skeleton className="w-80 h-5 mt-2" />
                <Skeleton className="w-40 h-11 mt-8" />
            </div>
            <div className="w-full max-w-5xl mx-auto py-12">
                <div className="grid md:grid-cols-3 gap-6 text-center">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
         <div className="p-2 md:p-4 border-t bg-background/80 backdrop-blur-sm">
             <div className="w-full max-w-4xl mx-auto space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                 </div>
                 <Skeleton className="h-20 w-full" />
             </div>
         </div>
      </main>
    </div>
  );
}
