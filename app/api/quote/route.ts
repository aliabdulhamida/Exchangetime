import { NextRequest, NextResponse } from 'next/server';

import {
  fetchYahooChart,
  fetchYahooQuoteSnapshot,
  normalizeYahooSymbol,
  normalizeYieldToPercent,
  toFiniteNumber,
  toNullableString,
} from '@/lib/server/yahoo-finance';

const ALLOWED_EVENTS = new Set(['div', 'split', 'div,splits', 'capitalGain', 'history']);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = normalizeYahooSymbol(url.searchParams.get('symbol') || '', {
      allowFxWithSuffix: true,
      allowFxPair: false,
    });
    if (!symbol) return NextResponse.json({ error: 'Missing or invalid symbol' }, { status: 400 });

    const wantChart =
      url.searchParams.get('chart') === '1' || url.searchParams.get('chart') === 'true';

    if (wantChart) {
      const eventsRaw = (url.searchParams.get('events') || '').trim();
      const chart = await fetchYahooChart(symbol, {
        interval: url.searchParams.get('interval') || '',
        range: url.searchParams.get('range') || '',
        period1: url.searchParams.get('period1') || '',
        period2: url.searchParams.get('period2') || '',
        includePrePost: url.searchParams.get('includePrePost') || '',
        events: ALLOWED_EVENTS.has(eventsRaw) ? eventsRaw : '',
      });

      if (!chart.ok) {
        return NextResponse.json(
          {
            error: 'Chart endpoint failed',
            status: chart.status,
            details: chart.error,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ...(chart.data.chartRaw || {}),
        series: chart.data.series,
        timestamps: chart.data.timestamps,
        currency: chart.data.currency,
        source: 'chart',
      });
    }

    const quoteSnapshot = await fetchYahooQuoteSnapshot(symbol);
    if (!quoteSnapshot.ok) {
      return NextResponse.json(
        {
          error: 'Quote endpoint failed',
          status: quoteSnapshot.status,
          details: quoteSnapshot.error,
        },
        { status: 502 },
      );
    }

    const snapshot = quoteSnapshot.data;
    const meta = snapshot.meta || {};
    const summaryProfile = snapshot.summaryProfile || {};
    const summaryDetail = snapshot.summaryDetail || {};
    const defaultKeyStats = snapshot.defaultKeyStats || {};
    const financialData = snapshot.financialData || {};
    const quoteResult = snapshot.quoteResult || {};

    return NextResponse.json({
      price: snapshot.price,
      previousClose: snapshot.previousClose,
      currency: snapshot.currency,
      symbol,
      source: 'chart',
      meta,
      company: {
        shortName: toNullableString(quoteResult?.shortName),
        longName: toNullableString(quoteResult?.longName),
        quoteType:
          toNullableString(quoteResult?.quoteType) || toNullableString(meta?.instrumentType),
        exchange:
          toNullableString(quoteResult?.fullExchangeName) ||
          toNullableString(quoteResult?.exchange) ||
          toNullableString(meta?.exchangeName),
        sector: toNullableString(summaryProfile?.sector),
        industry: toNullableString(summaryProfile?.industry),
        country: toNullableString(summaryProfile?.country),
        website: toNullableString(summaryProfile?.website),
        businessSummary: toNullableString(summaryProfile?.longBusinessSummary),
      },
      metrics: {
        marketCap:
          toFiniteNumber(quoteResult?.marketCap) ??
          toFiniteNumber(summaryDetail?.marketCap) ??
          toFiniteNumber(defaultKeyStats?.marketCap),
        dayHigh:
          toFiniteNumber(quoteResult?.regularMarketDayHigh) ??
          toFiniteNumber(summaryDetail?.dayHigh),
        dayLow:
          toFiniteNumber(quoteResult?.regularMarketDayLow) ??
          toFiniteNumber(summaryDetail?.dayLow),
        fiftyTwoWeekHigh:
          toFiniteNumber(quoteResult?.fiftyTwoWeekHigh) ??
          toFiniteNumber(summaryDetail?.fiftyTwoWeekHigh),
        fiftyTwoWeekLow:
          toFiniteNumber(quoteResult?.fiftyTwoWeekLow) ??
          toFiniteNumber(summaryDetail?.fiftyTwoWeekLow),
        trailingPE:
          toFiniteNumber(quoteResult?.trailingPE) ??
          toFiniteNumber(summaryDetail?.trailingPE) ??
          toFiniteNumber(defaultKeyStats?.trailingPE),
        forwardPE:
          toFiniteNumber(quoteResult?.forwardPE) ??
          toFiniteNumber(summaryDetail?.forwardPE) ??
          toFiniteNumber(defaultKeyStats?.forwardPE),
        epsTrailingTwelveMonths:
          toFiniteNumber(quoteResult?.epsTrailingTwelveMonths) ??
          toFiniteNumber(defaultKeyStats?.trailingEps),
        beta:
          toFiniteNumber(quoteResult?.beta) ??
          toFiniteNumber(defaultKeyStats?.beta) ??
          toFiniteNumber(financialData?.beta),
        volume:
          toFiniteNumber(quoteResult?.regularMarketVolume) ??
          toFiniteNumber(summaryDetail?.volume),
        averageVolume:
          toFiniteNumber(quoteResult?.averageDailyVolume3Month) ??
          toFiniteNumber(summaryDetail?.averageVolume),
        dividendRate:
          toFiniteNumber(quoteResult?.dividendRate) ??
          toFiniteNumber(summaryDetail?.dividendRate),
        dividendYieldPct: normalizeYieldToPercent(
          toFiniteNumber(quoteResult?.dividendYield) ??
            toFiniteNumber(summaryDetail?.dividendYield),
        ),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
