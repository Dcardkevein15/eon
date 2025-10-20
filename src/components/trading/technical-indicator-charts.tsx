'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IndicatorsSchema } from '@/lib/types';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { z } from 'zod';
import { format, fromUnixTime } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { TrendingUp, TrendingDown, Waves, ChevronsRightLeft, BarChart2 } from 'lucide-react';

type Indicators = z.infer<typeof IndicatorsSchema>;

interface TechnicalIndicatorChartsProps {
  indicators: Indicators;
  technicalSummary: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length && label) {
    const date = fromUnixTime(label / 1000);
    return (
      <div className="p-2 bg-background/80 border rounded-lg shadow-xl text-xs">
        <p className="font-bold">{format(date, "d MMM yyyy", { locale: es })}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {`${p.name}: ${p.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const xTickFormatter = (timestamp: number) => format(fromUnixTime(timestamp / 1000), 'd MMM');

const IndicatorChart = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="p-4 rounded-lg bg-card/70 border border-border/50">
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
            {icon}
            {title}
        </h4>
        <div className="h-28 w-full">
            {children}
        </div>
    </div>
);

export default function TechnicalIndicatorCharts({ indicators, technicalSummary }: TechnicalIndicatorChartsProps) {
  if (!indicators) return null;

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle>Indicadores Técnicos</CardTitle>
        <CardDescription>Análisis cuantitativo de los datos del mercado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* RSI Chart */}
            <IndicatorChart title="Índice de Fuerza Relativa (RSI)" icon={<TrendingUp />}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={indicators.rsi} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                        <XAxis dataKey="timestamp" tickFormatter={xTickFormatter} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={10}/>
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={70} label={{ value: 'Sobrecompra', position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} stroke="hsl(var(--destructive) / 0.5)" strokeDasharray="3 3" />
                        <ReferenceLine y={30} label={{ value: 'Sobreventa', position: 'insideBottomRight', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} stroke="hsl(var(--primary) / 0.5)" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.2)" name="RSI"/>
                    </AreaChart>
                </ResponsiveContainer>
            </IndicatorChart>
            
            {/* MACD Chart */}
            <IndicatorChart title="Convergencia/Divergencia (MACD)" icon={<ChevronsRightLeft />}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={indicators.macd} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                        <XAxis dataKey="timestamp" tickFormatter={xTickFormatter} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: "10px"}}/>
                        <Line type="monotone" dataKey="MACD" stroke="hsl(var(--chart-1))" dot={false} name="MACD"/>
                        <Line type="monotone" dataKey="signal" stroke="hsl(var(--chart-2))" dot={false} name="Señal"/>
                        <Bar dataKey="histogram" barSize={3}>
                            {indicators.macd.map((entry, index) => (
                                <Bar key={`bar-${index}`} dataKey="histogram" fill={entry.histogram > 0 ? 'hsl(var(--primary)/0.5)' : 'hsl(var(--destructive)/0.5)'} />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </IndicatorChart>

            {/* Bollinger Bands */}
            <IndicatorChart title="Bandas de Bollinger" icon={<Waves />}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={indicators.bollingerBands} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                        <XAxis dataKey="timestamp" tickFormatter={xTickFormatter} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: "10px"}}/>
                        <Line dataKey="upper" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" dot={false} name="Superior"/>
                        <Line dataKey="middle" stroke="hsl(var(--primary))" dot={false} name="Media"/>
                        <Line dataKey="lower" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" dot={false} name="Inferior"/>
                    </LineChart>
                </ResponsiveContainer>
            </IndicatorChart>

             {/* SMA Crossover */}
            <IndicatorChart title="Cruce de Medias Móviles" icon={<TrendingUp />}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={indicators.sma} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                        <XAxis dataKey="timestamp" tickFormatter={xTickFormatter} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: "10px"}}/>
                        <Line dataKey="price" stroke="hsl(var(--foreground)/0.5)" dot={false} name="Precio"/>
                        <Line dataKey="sma10" stroke="hsl(var(--chart-3))" dot={false} name="SMA 10"/>
                        <Line dataKey="sma20" stroke="hsl(var(--chart-4))" dot={false} name="SMA 20"/>
                    </LineChart>
                </ResponsiveContainer>
            </IndicatorChart>

            {/* Volume Chart */}
            <IndicatorChart title="Volumen" icon={<BarChart2 />}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={indicators.sma} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                         <XAxis dataKey="timestamp" tickFormatter={xTickFormatter} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                         <YAxis tickFormatter={(v) => `${(v/1e9).toFixed(1)}B`} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={10}/>
                         <Tooltip content={<CustomTooltip />} />
                         <Bar dataKey="volume" fill="hsl(var(--primary)/0.4)" name="Volumen"/>
                    </BarChart>
                </ResponsiveContainer>
            </IndicatorChart>

        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none mt-6 pt-4 border-t border-border/50">
            <h4 className="font-semibold text-primary">Resumen del Analista Técnico</h4>
            <ReactMarkdown>{technicalSummary}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
