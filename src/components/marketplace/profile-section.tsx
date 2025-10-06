'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ReactNode } from "react";

interface ProfileSectionProps {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export default function ProfileSection({ title, icon, children, className }: ProfileSectionProps) {
    return (
        <Card className={`mb-6 ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                    {icon}
                    <span>{title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
}

    