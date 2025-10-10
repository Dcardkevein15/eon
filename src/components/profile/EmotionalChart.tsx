'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  CartesianGrid,
} from 'recharts';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type EmotionalStatePoint = {
  date: string;
  sentiment: number;
  summary: string;
  keyEvents: string[];
};

interface EmotionalChartProps {
  data: EmotionalStatePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateLabel = payload[0].payload.date; // Use the original date string 'YYYY-MM-DD'

    try {
      const parsedDate = parse(dateLabel, 'yyyy-MM-dd', new Date());
      return (
        <Card className="max-w-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-base">
              {format(parsedDate, "eeee, d 'de' MMMM", { locale: es })}
            </CardTitle>
            <CardDescription>{data.summary}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Eventos Clave:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {data.keyEvents.map((event: string, index: number) => (
                <li key={index}>{event}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );
    } catch (error) {
      return (
         <Card className="max-w-sm p-4">
          <p>Error al mostrar fecha.</p>
        </Card>
      );
    }
  }

  return null;
};


export default function EmotionalChart({ data }: EmotionalChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    // The date is already a 'YYYY-MM-DD' string, which recharts can handle
  }));

  const tickFormatter = (value: string) => {
    try {
      const date = parse(value, 'yyyy-MM-dd', new Date());
      return format(date, 'd MMM', { locale: es });
    } catch (e) {
      return '';
    }
  };

  // Determine the domain for the brush
  const numEntries = formattedData.length;
  const startIndex = Math.max(0, numEntries - 7); // Show last 7 days by default
  const endIndex = numEntries - 1;


  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 20,
            left: -20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tickFormatter={tickFormatter}
            minTickGap={15}
          />
          <YAxis 
            domain={[-1.1, 1.1]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => 
                value === 1 ? 'Positivo' : value === -1 ? 'Negativo' : value === 0 ? 'Neutral' : ''
            }
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--accent))', strokeDasharray: '3 3' }} 
            wrapperStyle={{ zIndex: 100 }}
          />
          
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />

          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 6 }}
            name="Sentimiento"
          />

          {numEntries > 1 && (
             <Brush 
                dataKey="date" 
                height={30} 
                stroke="hsl(var(--primary))"
                fill="hsl(var(--sidebar-background))"
                tickFormatter={tickFormatter}
                startIndex={startIndex}
                endIndex={endIndex}
             >
                {/* This allows the brush to have its own mini-chart */}
                <LineChart>
                   <Line type="monotone" dataKey="sentiment" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
             </Brush>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
