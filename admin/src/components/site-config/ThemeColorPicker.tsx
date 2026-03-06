import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_PRIMARY,
  hexToRgbString,
  contrastRatio,
  wcagLevel,
} from '@/lib/color-utils'

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

interface ThemeColorPickerProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

function parsePrimary(json: string): string {
  try {
    const obj = JSON.parse(json)
    return HEX_REGEX.test(obj.primary) ? obj.primary : DEFAULT_PRIMARY
  } catch {
    return DEFAULT_PRIMARY
  }
}

function serialize(primary: string): string {
  const rgb = hexToRgbString(primary)
  return JSON.stringify({
    primary,
    secondary: primary,
    primaryRgb: rgb,
    secondaryRgb: rgb,
  })
}

function ContrastBadge({ hex, background, label }: { hex: string; background: string; label: string }) {
  const ratio = contrastRatio(hex, background)
  const level = wcagLevel(ratio)
  const colorClass =
    level === 'AAA'
      ? 'text-emerald-600 dark:text-emerald-400'
      : level === 'AA'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <span className={`text-xs ${colorClass}`}>
      {label} : {ratio.toFixed(1)}:1 ({level === 'fail' ? 'Insuffisant' : level})
    </span>
  )
}

export function ThemeColorPicker({ value, onChange, error }: ThemeColorPickerProps) {
  const parsed = parsePrimary(value)
  const [primaryText, setPrimaryText] = useState(parsed)
  const [primaryHex, setPrimaryHex] = useState(parsed)

  useEffect(() => {
    const p = parsePrimary(value)
    setPrimaryHex(p)
    setPrimaryText(p)
  }, [value])

  function commit(primary: string) {
    setPrimaryHex(primary)
    setPrimaryText(primary)
    onChange(serialize(primary))
  }

  function handlePrimaryColor(val: string) {
    commit(val)
  }

  function handlePrimaryText(val: string) {
    setPrimaryText(val)
    if (HEX_REGEX.test(val)) {
      commit(val.toLowerCase())
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <Label className="font-medium">Couleur principale</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryHex}
            onChange={(e) => handlePrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          />
          <Input
            value={primaryText}
            onChange={(e) => handlePrimaryText(e.target.value)}
            onBlur={() => {
              if (!HEX_REGEX.test(primaryText)) setPrimaryText(primaryHex)
            }}
            placeholder="#000000"
            className={`w-32 font-mono text-sm ${primaryText && !HEX_REGEX.test(primaryText) ? 'border-destructive' : ''}`}
          />
          <div
            className="h-9 w-9 shrink-0 rounded-full border"
            style={{ backgroundColor: primaryHex }}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <ContrastBadge hex={primaryHex} background="#FFFFFF" label="Sur fond blanc" />
          <ContrastBadge hex={primaryHex} background="#1F2937" label="Sur fond sombre" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
