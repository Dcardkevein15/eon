'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, FileText, Loader2, AlertTriangle, ExternalLink, Mail, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TherapistApplication } from '@/lib/types';
import { approveApplication, rejectApplication } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ApplicationCardProps {
  application: TherapistApplication;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pendiente' },
  approved: { icon: Check, color: 'text-green-500', label: 'Aprobada' },
  rejected: { icon: X, color: 'text-red-500', label: 'Rechazada' },
};

export default function ApplicationCard({ application }: ApplicationCardProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  
  const { applicationData, status, submittedAt, displayName, email } = application;
  const { icon: StatusIcon, color: statusColor, label: statusLabel } = statusConfig[status];

  const handleApprove = async () => {
    setIsProcessing(true);
    setActionType('approve');
    const result = await approveApplication(application);
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsProcessing(false);
    setActionType(null);
  };
  
  const handleReject = async () => {
    setIsProcessing(true);
    setActionType('reject');
    const result = await rejectApplication(application.id);
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
     setIsProcessing(false);
     setActionType(null);
  };
  
  const formattedDate = submittedAt?.toDate ? formatDistanceToNow(submittedAt.toDate(), { addSuffix: true, locale: es }) : 'hace un momento';

  return (
    <Card className="bg-card/50 transition-all hover:shadow-lg hover:border-border">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={applicationData.photoUrl || `https://i.pravatar.cc/150?u=${application.userId}`} />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{displayName}</CardTitle>
                <CardDescription className='flex items-center gap-4 text-xs mt-1'>
                    <span className='flex items-center gap-1.5'><Mail className="w-3 h-3"/>{applicationData.email}</span>
                    <span className='flex items-center gap-1.5'><MessageCircle className="w-3 h-3"/>{applicationData.whatsapp}</span>
                </CardDescription>
              </div>
            </div>
            <Badge variant={status === 'pending' ? 'secondary' : status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5">
                <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                <span>{statusLabel}</span>
            </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-2">Enviada {formattedDate}</p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="details">
            <AccordionTrigger>Ver Detalles de la Solicitud</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <div>
                    <h4 className="font-semibold text-sm">Biografía</h4>
                    <p className="text-sm text-muted-foreground">{applicationData.bio}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Credenciales</h4>
                    <p className="text-sm text-muted-foreground">{applicationData.credentials}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <h4 className="font-semibold text-sm">Especialidades</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {applicationData.specialties.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Idiomas</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {applicationData.languages.map(l => <Badge key={l} variant="outline">{l}</Badge>)}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Precio por Sesión</h4>
                        <p className="text-sm font-semibold text-foreground">${applicationData.pricePerSession}</p>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm">Documentos</h4>
                    <div className="flex gap-4 mt-2">
                        <Button asChild variant="outline" size="sm">
                            <a href={applicationData.identityDocumentUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> Doc. Identidad
                                <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href={applicationData.professionalLicenseUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> Licencia Profesional
                                 <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                        </Button>
                    </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </CardContent>
      {status === 'pending' && (
        <CardFooter className="flex justify-end gap-2">
          <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
            {isProcessing && actionType === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Rechazar
          </Button>
          <Button onClick={handleApprove} disabled={isProcessing}>
             {isProcessing && actionType === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Aprobar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
