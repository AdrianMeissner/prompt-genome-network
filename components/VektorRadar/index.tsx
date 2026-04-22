'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { VEKTOR_LABELS } from '@/lib/mutations'

interface VektorRadarProps {
  vektor: number[]
  vergleichsVektor?: number[]  // Optional: alter Vektor zum Vergleich
  size?: number
}

const FARBEN = {
  aktuell: '#6366f1',
  vergleich: '#6b7280',
}

export default function VektorRadar({ vektor, vergleichsVektor, size = 300 }: VektorRadarProps) {
  const data = VEKTOR_LABELS.map((label, i) => ({
    dimension: label,
    aktuell: Math.round((vektor[i] ?? 0) * 100),
    vergleich: vergleichsVektor ? Math.round((vergleichsVektor[i] ?? 0) * 100) : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#1e1e2e" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#6b7280', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 9 }}
          tickCount={4}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#12121a',
            border: '1px solid #1e1e2e',
            borderRadius: '8px',
            color: '#e8e8f0',
          }}
          formatter={(value) => [`${value}%`]}
        />
        {vergleichsVektor && (
          <Radar
            name="Vorher"
            dataKey="vergleich"
            stroke={FARBEN.vergleich}
            fill={FARBEN.vergleich}
            fillOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        <Radar
          name="Aktuell"
          dataKey="aktuell"
          stroke={FARBEN.aktuell}
          fill={FARBEN.aktuell}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
