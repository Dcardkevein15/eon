'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    index: number;
}

export const FeatureCard = ({ icon: Icon, title, description, href, index }: FeatureCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            className="h-full"
        >
            <Link href={href} className="h-full block">
                <Card className="h-full bg-card/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 transform hover:-translate-y-1">
                    <CardHeader>
                        <div className="p-3 bg-primary/10 rounded-lg w-fit border border-primary/20 mb-3">
                            <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>{description}</CardDescription>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
};
