'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, CheckCircle, Sparkles } from "lucide-react";

type FilterValue = 'all' | 'generated' | 'new';

interface FilterTabsProps {
    filter: FilterValue;
    setFilter: (filter: FilterValue) => void;
}

export default function FilterTabs({ filter, setFilter }: FilterTabsProps) {
    return (
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterValue)} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
                <TabsTrigger value="all">
                    <List className="mr-2 h-4 w-4" />
                    Todos
                </TabsTrigger>
                <TabsTrigger value="generated">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Generados
                </TabsTrigger>
                <TabsTrigger value="new">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Nuevos
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
