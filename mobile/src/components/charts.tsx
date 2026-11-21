import { useMemo } from 'react'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg'
import type { Bill } from '../api'
import { money } from '../api'
import { colors, fonts, radius, space } from '../theme'
import { Card, Empty, Section } from './ui'

export type PeriodPoint = { period: string; billed: number; collected: number }
export type TypePoint = { type: string; billed: number; collected: number }

export function buildPeriodSeries(bills: Bill[]): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>()
  for (const b of bills) {
    const row = map.get(b.billingPeriod) ?? { period: b.billingPeriod, billed: 0, collected: 0 }
    row.billed += Number(b.amount) || 0
    row.collected += Number(b.paidAmount) || 0
    map.set(b.billingPeriod, row)
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period)).slice(-8)
}

export function buildTypeSeries(bills: Bill[]): TypePoint[] {
  const map = new Map<string, TypePoint>()
  for (const b of bills) {
    const row = map.get(b.billType) ?? { type: b.billType, billed: 0, collected: 0 }
    row.billed += Number(b.amount) || 0
    row.collected += Number(b.paidAmount) || 0
    map.set(b.billType, row)
  }
  return [...map.values()].sort((a, b) => b.collected - a.collected)
}

function shortPeriod(p: string) {
  if (p.length <= 7) return p
  return p.slice(-7)
}

/** Dual-series bar chart: billed vs collected by period */
export function CollectionBars({
  data, height = 200,
}: { data: PeriodPoint[]; height?: number }) {
  const { width: win } = useWindowDimensions()
  const width = Math.min(win - 64, 420)
  const padL = 4
  const padR = 4
  const padT = 12
  const padB = 26
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const max = Math.max(1, ...data.map((d) => Math.max(d.billed, d.collected)))
  const groupW = innerW / Math.max(data.length, 1)
  const barW = Math.min(16, Math.max(8, groupW * 0.3))

  if (!data.length) return null

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="brandBar" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.gateAccent} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.brand} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {data.map((d, i) => {
          const cx = padL + groupW * i + groupW / 2
          const hB = (d.billed / max) * innerH
          const hC = (d.collected / max) * innerH
          return (
            <G key={d.period}>
              <Rect
                x={cx - barW - 2}
                y={padT + innerH - hB}
                width={barW}
                height={Math.max(hB, 3)}
                rx={5}
                fill={colors.secondaryFill}
              />
              <Rect
                x={cx + 2}
                y={padT + innerH - hC}
                width={barW}
                height={Math.max(hC, 3)}
                rx={5}
                fill="url(#brandBar)"
              />
              <SvgText
                x={cx}
                y={height - 6}
                fill={colors.muted}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
              >
                {shortPeriod(d.period)}
              </SvgText>
            </G>
          )
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.secondaryFill }]} />
          <Text style={styles.legendText}>Billed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.brand }]} />
          <Text style={styles.legendText}>Collected</Text>
        </View>
      </View>
    </View>
  )
}

/** Horizontal collected bars by bill type */
export function TypeBars({ data }: { data: TypePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.billed))
  if (!data.length) return null
  return (
    <View style={{ gap: 12 }}>
      {data.slice(0, 6).map((d) => {
        const pctB = Math.round((d.billed / max) * 100)
        const collectW = Math.round((d.collected / max) * 100)
        const pctC = d.billed > 0 ? Math.round((d.collected / d.billed) * 100) : 0
        return (
          <View key={d.type}>
            <View style={styles.typeHead}>
              <Text style={styles.typeName}>{d.type}</Text>
              <Text style={styles.typeVal}>{money(d.collected)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackBilled, { width: `${pctB}%` }]} />
              <View style={[styles.trackCollect, { width: `${collectW}%` }]} />
            </View>
            <Text style={styles.typeMeta}>{pctC}% collected · billed {money(d.billed)}</Text>
          </View>
        )
      })}
    </View>
  )
}

/** Donut for collection rate */
export function CollectionDonut({
  collected, billed, size = 132,
}: { collected: number; billed: number; size?: number }) {
  const rate = billed > 0 ? Math.min(1, collected / billed) : 0
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * rate
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.secondaryFill}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutPct}>{Math.round(rate * 100)}%</Text>
        <Text style={styles.donutLabel}>collected</Text>
      </View>
    </View>
  )
}

/** Spark area for collected trend */
export function IncomeSpark({ data, height = 72 }: { data: PeriodPoint[]; height?: number }) {
  const { width: win } = useWindowDimensions()
  const width = Math.min(win - 64, 420)
  const values = data.map((d) => d.collected)
  const max = Math.max(1, ...values)
  const points = values.map((v, i) => {
    const x = values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width
    const y = height - (v / max) * (height - 8) - 4
    return { x, y }
  })
  if (points.length < 2) return null
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.brand} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.brand} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#sparkFill)" />
      <Path d={line} stroke={colors.brand} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  )
}

export function IncomeAnalyticsPanel({
  bills, collected, pending, totalBilled, title = 'Platform income',
}: {
  bills: Bill[]
  collected: number
  pending: number
  totalBilled: number
  title?: string
}) {
  const periods = useMemo(() => buildPeriodSeries(bills), [bills])
  const types = useMemo(() => buildTypeSeries(bills), [bills])
  const rate = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0

  return (
    <View>
      <Section label={title} />
      <Card>
        <View style={styles.incomeHero}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.incomeLabel}>Collected</Text>
            <Text style={styles.incomeBig}>{money(collected)}</Text>
            <Text style={styles.incomeHint}>{rate}% of {money(totalBilled)} billed</Text>
            <Text style={[styles.incomeHint, { marginTop: 8, color: colors.warning }]}>
              Outstanding {money(pending)}
            </Text>
          </View>
          <CollectionDonut collected={collected} billed={totalBilled} />
        </View>
        {periods.length >= 2 ? (
          <View style={{ marginTop: space.md }}>
            <Text style={styles.chartCaption}>Collection trend</Text>
            <IncomeSpark data={periods} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.chartTitle}>Billed vs collected</Text>
        <Text style={styles.chartSub}>By billing period · live bills API</Text>
        {periods.length ? (
          <CollectionBars data={periods} />
        ) : (
          <Empty title="No billing yet" body="Create invoices to see income graphs." icon="wallet-outline" />
        )}
      </Card>

      <Card>
        <Text style={styles.chartTitle}>By bill type</Text>
        <Text style={styles.chartSub}>Maintenance, water, parking…</Text>
        {types.length ? (
          <TypeBars data={types} />
        ) : (
          <Empty title="No types yet" body="Bill types appear after invoices exist." icon="pie-chart-outline" />
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginTop: 4, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.muted, fontFamily: fonts.sansMed },
  typeHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeName: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  typeVal: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.brand },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryFill,
    overflow: 'hidden',
    position: 'relative',
  },
  trackBilled: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,26,23,0.12)',
    borderRadius: radius.full,
  },
  trackCollect: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.brand,
    borderRadius: radius.full,
  },
  typeMeta: { marginTop: 4, fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutPct: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.text, letterSpacing: -0.8 },
  donutLabel: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  incomeHero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  incomeLabel: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  incomeBig: {
    marginTop: 6,
    fontSize: 32,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -1,
  },
  incomeHint: { marginTop: 6, fontSize: 13, color: colors.muted, fontFamily: fonts.sans },
  chartCaption: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chartTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  chartSub: { marginTop: 4, marginBottom: 14, fontSize: 13, color: colors.muted, fontFamily: fonts.sans },
})
