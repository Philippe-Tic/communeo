import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Copy } from 'lucide-react'
import { DAYS, DAY_LABELS, type DayKey, type WeekSchedule } from './types'

interface DuplicatePopoverProps {
  schedule: WeekSchedule
  onDuplicate: (source: DayKey, targets: DayKey[]) => void
}

export function DuplicatePopover({ schedule, onDuplicate }: DuplicatePopoverProps) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<DayKey>('lundi')
  const [targets, setTargets] = useState<Set<DayKey>>(new Set())

  function toggleTarget(day: DayKey) {
    setTargets((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  function selectAll() {
    const allOthers = DAYS.filter((d) => d !== source)
    setTargets((prev) => (prev.size === allOthers.length ? new Set() : new Set(allOthers)))
  }

  function handleApply() {
    if (targets.size > 0) {
      onDuplicate(source, Array.from(targets))
      setOpen(false)
      setTargets(new Set())
    }
  }

  const availableTargets = DAYS.filter((d) => d !== source)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Dupliquer
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium">Jour source</label>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as DayKey)
                setTargets(new Set())
              }}
              className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]} {schedule[d].open ? '' : '(Fermé)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Appliquer à</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                {targets.size === availableTargets.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {availableTargets.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={targets.has(d)}
                    onChange={() => toggleTarget(d)}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  {DAY_LABELS[d]}
                </label>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={handleApply} disabled={targets.size === 0}>
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
