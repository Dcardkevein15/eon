'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Timer } from 'lucide-react';
import type { SimulationSession } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface SessionCardProps {
    session: SimulationSession;
    onDelete: (sessionId: string) => void;
}

const Countdown = ({ expiresAt, onExpire }: { expiresAt: Date, onExpire: () => void }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +expiresAt - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }, [expiresAt]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (Object.keys(newTimeLeft).length === 0) {
                onExpire();
            }
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        const strValue = String(value).padStart(2, '0');
        return (
            <span key={interval} className="tabular-nums">
                {strValue}{interval.charAt(0)}
            </span>
        );
    });

    return (
        <div className="flex items-center gap-1 text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
            <Timer className="w-3 h-3" />
            {timerComponents.length ? timerComponents.reduce((prev, curr) => <>{prev}:{curr}</>) : <span>Expirado</span>}
        </div>
    );
};


export default function SessionCard({ session, onDelete }: SessionCardProps) {
    
    const { id, scenarioTitle, createdAt, expiresAt, path, completedAt } = session;

    const handleExpire = useCallback(() => {
        if (!completedAt) {
            onDelete(id);
        }
    }, [id, completedAt, onDelete]);

    const getFormattedDate = (timestamp: any) => {
        if (!timestamp) return 'Fecha desconocida';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        } catch {
            return 'Fecha inválida';
        }
    };
    
    const expiresAtDate = expiresAt?.toDate ? expiresAt.toDate() : new Date();


    return (
        <Card className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all relative">
             {!completedAt && (
                <div className="absolute top-3 right-3 z-10">
                    <Countdown expiresAt={expiresAtDate} onExpire={handleExpire} />
                </div>
            )}
            <CardHeader>
                <CardTitle className="truncate pr-20">{scenarioTitle}</CardTitle>
                <CardDescription>{getFormattedDate(createdAt)}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                {completedAt && (
                    <div className='flex items-center text-sm text-green-400'>
                        <CheckCircle className='w-4 h-4 mr-2' />
                        <span>Completado</span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={path}>
                        {completedAt ? 'Revisar Sesión' : 'Continuar Práctica'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
