import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cryptoId = searchParams.get('id');
  const days = searchParams.get('days') || '30';

  if (!cryptoId) {
    return NextResponse.json({ error: 'Crypto ID es requerido' }, { status: 400 });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de la API de CoinGecko: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Error de la API de CoinGecko: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error en el proxy de la API de crypto:', error);
    return NextResponse.json({ error: 'Error interno del servidor al contactar la API de CoinGecko', details: error.message }, { status: 500 });
  }
}
