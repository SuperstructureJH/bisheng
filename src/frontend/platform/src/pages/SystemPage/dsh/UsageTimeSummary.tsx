import { Button } from '@/components/bs-ui/button'
import { Input } from '@/components/bs-ui/input'
import { getDshUsageTimeSummary } from '@/controllers/API/dsh'
import type { DshUsageTimeSummary } from '@/types/dsh'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type UsagePreset = 'today' | '7d' | '30d' | 'custom'
type UsageRange = { startAt: string; endAt: string }

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

function twoDigits(value: number): string {
    return String(value).padStart(2, '0')
}

export function formatShanghaiInstant(timestamp: number): string {
    const local = new Date(timestamp + SHANGHAI_OFFSET_MS)
    return `${local.getUTCFullYear()}-${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(local.getUTCDate())}T${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}:${twoDigits(local.getUTCSeconds())}+08:00`
}

export function usagePresetRange(preset: Exclude<UsagePreset, 'custom'>, now = Date.now()): UsageRange {
    if (preset !== 'today') {
        const days = preset === '7d' ? 7 : 30
        return {
            startAt: formatShanghaiInstant(now - days * 24 * 60 * 60 * 1000),
            endAt: formatShanghaiInstant(now),
        }
    }
    const local = new Date(now + SHANGHAI_OFFSET_MS)
    const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - SHANGHAI_OFFSET_MS
    return {
        startAt: formatShanghaiInstant(start),
        endAt: formatShanghaiInstant(now),
    }
}

function localInputValue(value: string): string {
    return formatShanghaiInstant(Date.parse(value)).slice(0, 16)
}

function inputInstant(value: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return null
    const parsed = Date.parse(`${value}:00+08:00`)
    return Number.isFinite(parsed) ? formatShanghaiInstant(parsed) : null
}

function pointLabel(value: string, granularity: 'hour' | 'day'): string {
    const local = new Date(Date.parse(value) + SHANGHAI_OFFSET_MS)
    const date = `${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(local.getUTCDate())}`
    return granularity === 'hour' ? `${date} ${twoDigits(local.getUTCHours())}:00` : date
}

interface UsageTimeSummaryProps {
    userId: string
    tenantId?: string
    revision: number
}

export function UsageTimeSummaryPanel({ userId, tenantId, revision }: UsageTimeSummaryProps) {
    const { t } = useTranslation()
    const [preset, setPreset] = useState<UsagePreset>('7d')
    const [range, setRange] = useState<UsageRange>(() => usagePresetRange('7d'))
    const [draftStart, setDraftStart] = useState(() => localInputValue(range.startAt))
    const [draftEnd, setDraftEnd] = useState(() => localInputValue(range.endAt))
    const [summary, setSummary] = useState<DshUsageTimeSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [rangeError, setRangeError] = useState(false)

    useEffect(() => {
        const abort = new AbortController()
        setLoading(true)
        setError(false)
        getDshUsageTimeSummary(userId, { ...range, tenantId }, abort.signal)
            .then((value) => {
                if (!abort.signal.aborted) setSummary(value)
            })
            .catch(() => {
                if (!abort.signal.aborted) {
                    setSummary(null)
                    setError(true)
                }
            })
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false)
            })
        return () => abort.abort()
    }, [range, revision, tenantId, userId])

    const maximumTokens = useMemo(
        () => Math.max(1, ...(summary?.points.map((point) => point.total_tokens ?? 0) ?? [])),
        [summary],
    )

    function choosePreset(next: Exclude<UsagePreset, 'custom'>) {
        const nextRange = usagePresetRange(next)
        setPreset(next)
        setRange(nextRange)
        setDraftStart(localInputValue(nextRange.startAt))
        setDraftEnd(localInputValue(nextRange.endAt))
        setRangeError(false)
    }

    function applyCustomRange() {
        const startAt = inputInstant(draftStart)
        const endAt = inputInstant(draftEnd)
        if (
            !startAt ||
            !endAt ||
            Date.parse(endAt) <= Date.parse(startAt) ||
            Date.parse(endAt) - Date.parse(startAt) > 366 * 24 * 60 * 60 * 1000
        ) {
            setRangeError(true)
            return
        }
        setRangeError(false)
        setRange({ startAt, endAt })
    }

    const totals = summary?.totals
    const activeHours =
        summary?.granularity === 'hour' ? summary.points.filter((point) => point.message_count > 0).length : null

    return (
        <section className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold">{t('dsh.timeUsage')}</h3>
                    <p className="text-sm text-muted-foreground">{t('dsh.beijingTime')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(['today', '7d', '30d'] as const).map((item) => (
                        <Button
                            key={item}
                            size="sm"
                            variant={preset === item ? 'default' : 'outline'}
                            onClick={() => choosePreset(item)}
                        >
                            {t(`dsh.range.${item}`)}
                        </Button>
                    ))}
                    <Button
                        size="sm"
                        variant={preset === 'custom' ? 'default' : 'outline'}
                        onClick={() => setPreset('custom')}
                    >
                        {t('dsh.range.custom')}
                    </Button>
                </div>
            </div>
            {preset === 'custom' && (
                <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1 text-sm">
                        <span>{t('dsh.rangeStart')}</span>
                        <Input
                            type="datetime-local"
                            value={draftStart}
                            onChange={(event) => setDraftStart(event.target.value)}
                        />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span>{t('dsh.rangeEnd')}</span>
                        <Input
                            type="datetime-local"
                            value={draftEnd}
                            onChange={(event) => setDraftEnd(event.target.value)}
                        />
                    </label>
                    <Button onClick={applyCustomRange}>{t('dsh.applyRange')}</Button>
                    {rangeError && (
                        <p role="alert" className="text-sm text-destructive">
                            {t('dsh.invalidRange')}
                        </p>
                    )}
                </div>
            )}
            {loading ? (
                <p role="status">{t('dsh.loading')}</p>
            ) : error || !summary || !totals ? (
                <p role="alert">{t('dsh.usageRangeUnavailable')}</p>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            [t('dsh.tokenUsage'), totals.total_tokens ?? t('dsh.unavailable')],
                            [t('dsh.messageCount'), totals.message_count],
                            [t('dsh.qaCount'), totals.qa_count],
                            [t('dsh.failedCount'), totals.failed_count],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-md bg-muted p-3">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('dsh.tokenBreakdown', {
                            input: totals.input_tokens ?? t('dsh.unavailable'),
                            output: totals.output_tokens ?? t('dsh.unavailable'),
                        })}
                        {activeHours !== null && ` · ${t('dsh.activeHours', { count: activeHours })}`}
                    </p>
                    {totals.missing_usage_count > 0 && (
                        <p role="status" className="text-sm text-amber-700">
                            {t('dsh.missingUsageCount', {
                                count: totals.missing_usage_count,
                            })}
                        </p>
                    )}
                    <div>
                        <h4 className="mb-2 text-sm font-medium">{t('dsh.usageTrend')}</h4>
                        <ul aria-label={t('dsh.usageTrend')} className="max-h-72 space-y-2 overflow-auto">
                            {summary.points.map((point) => {
                                const width = `${Math.max(2, ((point.total_tokens ?? 0) / maximumTokens) * 100)}%`
                                return (
                                    <li
                                        key={point.start_at}
                                        className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm"
                                    >
                                        <span className="text-muted-foreground">
                                            {pointLabel(point.start_at, summary.granularity)}
                                        </span>
                                        <span className="h-2 overflow-hidden rounded-full bg-muted">
                                            <span className="block h-full rounded-full bg-primary" style={{ width }} />
                                        </span>
                                        <span className="min-w-28 text-right tabular-nums">
                                            {point.total_tokens ?? '—'} Token · {point.message_count}{' '}
                                            {t('dsh.messagesUnit')}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </>
            )}
        </section>
    )
}
