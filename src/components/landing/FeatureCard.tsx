
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    index: number;
    isFeatured?: boolean;
}

export const FeatureCard = ({ icon: Icon, title, description, href, index, isFeatured = false }: FeatureCardProps) => {
    
    const cardContent = (
        <Card className={cn(
            "h-full bg-card/50 transition-all duration-300 transform hover:-translate-y-1 relative",
            isFeatured 
                ? "bg-gradient-to-br from-primary/10 via-background to-background border-2 border-transparent"
                : "hover:border-primary/50 hover:bg-card/80"
        )}>
            {isFeatured && <div className="animated-border rounded-lg" style={{ animationDuration: '6s', padding: '2px' }}></div>}
            <div className={cn("relative h-full flex flex-col", isFeatured && "bg-background rounded-md p-4")}>
                <CardHeader>
                    <div className={cn(
                        "p-3 rounded-lg w-fit border mb-3",
                        isFeatured 
                            ? "bg-primary/20 border-primary/30"
                            : "bg-primary/10 border-primary/20"
                    )}>
                        <Icon className={cn("w-6 h-6", isFeatured ? "text-primary/90" : "text-primary")} />
                    </div>
                    <CardTitle className={cn(isFeatured ? "text-primary" : "", "text-xl")}>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription>{description}</CardDescription>
                </CardContent>
            </div>
        </Card>
    );
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.05 * index }}
            className={cn("h-full", isFeatured ? "lg:row-span-2" : "lg:col-span-1")}
        >
            <Link href={href} className="h-full block">
                {cardContent}
            </Link>
        </motion.div>
    );
};
