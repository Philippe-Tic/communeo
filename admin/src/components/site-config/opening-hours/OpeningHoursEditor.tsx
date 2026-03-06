import { useCallback, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { DAYS, type DayKey, type DaySchedule, type WeekSchedule } from './types'
import { deserializeToWeekSchedule, serializeWeekSchedule } from './serialization'
import { DayRow } from './DayRow'
import { DuplicatePopover } from './DuplicatePopover'

interface OpeningHoursEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  setIsDirty: (dirty: boolean) => void
}

export function OpeningHoursEditor({ value, onChange, error, setIsDirty }: OpeningHoursEditorProps) {
  // Track last value we serialized ourselves to avoid re-deserializing our own output
  const lastSerializedRef = useRef<string | null>(null)
  const [schedule, setSchedule] = useState<WeekSchedule>(() => {
    lastSerializedRef.current = value
    return deserializeToWeekSchedule(value)
  })

  // Re-sync when parent value changes externally (e.g., form reset)
  if (value !== lastSerializedRef.current) {
    lastSerializedRef.current = value
    setSchedule(deserializeToWeekSchedule(value))
  }

  const handleChange = useCallback(
    (newSchedule: WeekSchedule) => {
      setSchedule(newSchedule)
      setIsDirty(true)
      const serialized = serializeWeekSchedule(newSchedule)
      lastSerializedRef.current = serialized
      onChange(serialized)
    },
    [onChange, setIsDirty],
  )

  function updateDay(day: DayKey, daySchedule: DaySchedule) {
    handleChange({ ...schedule, [day]: daySchedule })
  }

  function handleDuplicate(source: DayKey, targets: DayKey[]) {
    const sourceSchedule = schedule[source]
    const next = { ...schedule }
    for (const target of targets) {
      next[target] = {
        open: sourceSchedule.open,
        morning: { ...sourceSchedule.morning },
        afternoon: { ...sourceSchedule.afternoon },
      }
    }
    handleChange(next)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Horaires d'ouverture</Label>
        <DuplicatePopover schedule={schedule} onDuplicate={handleDuplicate} />
      </div>
      <div className="flex flex-col gap-1.5">
        {DAYS.map((day) => (
          <DayRow
            key={day}
            day={day}
            schedule={schedule[day]}
            onChange={(ds) => updateDay(day, ds)}
          />
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
