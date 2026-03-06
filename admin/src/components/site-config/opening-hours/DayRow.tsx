import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { DAY_LABELS, type DayKey, type DaySchedule } from './types'

interface DayRowProps {
  day: DayKey
  schedule: DaySchedule
  onChange: (schedule: DaySchedule) => void
}

export function DayRow({ day, schedule, onChange }: DayRowProps) {
  return (
    <div className="grid grid-cols-[90px_44px_1fr_1fr] items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5 max-sm:grid-cols-1 max-sm:gap-2">
      <span className="text-sm font-medium">{DAY_LABELS[day]}</span>

      <div className="flex items-center max-sm:justify-between">
        <span className="text-xs text-muted-foreground sm:hidden mr-2">
          {schedule.open ? 'Ouvert' : 'Fermé'}
        </span>
        <Switch
          checked={schedule.open}
          onCheckedChange={(open) => onChange({ ...schedule, open: !!open })}
          aria-label={`${DAY_LABELS[day]} ouvert/fermé`}
          size="sm"
        />
      </div>

      <div className={schedule.open ? '' : 'pointer-events-none opacity-30'}>
        <Label className="mb-1 text-xs text-muted-foreground">Matin</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={schedule.morning.start}
            onChange={(e) => onChange({ ...schedule, morning: { ...schedule.morning, start: e.target.value } })}
            disabled={!schedule.open}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="time"
            value={schedule.morning.end}
            onChange={(e) => onChange({ ...schedule, morning: { ...schedule.morning, end: e.target.value } })}
            disabled={!schedule.open}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      <div className={schedule.open ? '' : 'pointer-events-none opacity-30'}>
        <Label className="mb-1 text-xs text-muted-foreground">Après-midi</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={schedule.afternoon.start}
            onChange={(e) => onChange({ ...schedule, afternoon: { ...schedule.afternoon, start: e.target.value } })}
            disabled={!schedule.open}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="time"
            value={schedule.afternoon.end}
            onChange={(e) => onChange({ ...schedule, afternoon: { ...schedule.afternoon, end: e.target.value } })}
            disabled={!schedule.open}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}
