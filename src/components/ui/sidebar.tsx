'use client';

import * as React from 'react';
import { PanelLeft } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

// Context
type SidebarContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Main Sidebar Component
export function Sidebar({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[300px] p-0 z-50 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de Navegación</SheetTitle>
              <SheetDescription>
                Navega entre las diferentes secciones de la aplicación y gestiona tus chats.
              </SheetDescription>
            </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 h-screen fixed top-0 left-0 z-40',
        open ? 'w-72' : 'w-0'
      )}
    >
      {open && children}
    </aside>
  );
}

// Trigger
export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

// Inset for Main Content
export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useSidebar();
  const isMobile = useIsMobile();

  return <main className={cn(
    'flex-1 transition-[margin-left] duration-300',
    !isMobile && (open ? 'ml-72' : 'ml-0'),
    className
  )}>{children}</main>;
}

// Header
export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col', className)}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

// Content
export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto', className)}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

// Footer
export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-2 border-t border-sidebar-border', className)}
    {...props}
  />
));
SidebarFooter.displayName = 'SidebarFooter';


// Re-exporting other components for consistency if needed, but they are simple enough.
// The main logic is in Sidebar, SidebarProvider, SidebarTrigger, and SidebarInset.
// The rest of the original file had many more sub-components that are not strictly necessary
// for the current simplified and robust implementation.

const DUMMY_COMPONENTS = {
  SidebarMenu: 'ul',
  SidebarMenuItem: 'li',
  SidebarMenuButton: 'button',
  SidebarSeparator: 'hr',
  SidebarMenuSkeleton: 'div',
};

export const SidebarMenu = DUMMY_COMPONENTS.SidebarMenu;
export const SidebarMenuItem = DUMMY_COMPONENTS.SidebarMenuItem;
export const SidebarMenuButton = DUMMY_COMPONENTS.SidebarMenuButton;
export const SidebarSeparator = DUMMY_COMPONENTS.SidebarSeparator;
export const SidebarMenuSkeleton = DUMMY_COMPONENTS.SidebarMenuSkeleton;
