import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDshUsageTimeSummary } from '@/controllers/API/dsh'
import type { DshUsageTimeSummary } from '@/types/dsh'
import { UsageTimeSummaryPanel, usagePresetRange } from './UsageTimeSummary'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, args?: Record<string, unknown>) => (args ? `${key} ${JSON.stringify(args)}` : key),
    }),
}))
vi.mock('@/controllers/API/dsh', () => ({
    getDshUsageTimeSummary: vi.fn(),
}))

const summary: DshUsageTimeSummary = {
    start_at: '2026-09-07T12:00:00+08:00',
    end_at: '2026-09-14T12:00:00+08:00',
    timezone: 'Asia/Shanghai',
    granularity: 'day',
    totals: {
        message_count: 3,
        qa_count: 2,
        failed_count: 1,
        cancelled_count: 0,
        running_count: 0,
        usage_unknown_count: 0,
        recorded_usage_count: 2,
        missing_usage_count: 1,
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
    },
    points: [
        {
            message_count: 3,
            qa_count: 2,
            failed_count: 1,
            cancelled_count: 0,
            running_count: 0,
            usage_unknown_count: 0,
            recorded_usage_count: 2,
            missing_usage_count: 1,
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
            start_at: '2026-09-07T12:00:00+08:00',
            end_at: '2026-09-14T12:00:00+08:00',
        },
    ],
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getDshUsageTimeSummary).mockResolvedValue(summary)
})

describe('time-range usage statistics', () => {
    it('uses explicit Beijing ranges and keeps missing token records visible', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.setSystemTime(new Date('2026-09-14T04:00:00Z'))
        render(<UsageTimeSummaryPanel userId="20" tenantId="2" revision={0} />)

        expect(await screen.findByText('15')).toBeTruthy()
        expect(screen.getByText('3')).toBeTruthy()
        expect(screen.getByText('2')).toBeTruthy()
        expect(screen.getByText('1')).toBeTruthy()
        expect(screen.getByRole('status').textContent).toContain('dsh.missingUsageCount')
        expect(getDshUsageTimeSummary).toHaveBeenCalledWith(
            '20',
            {
                ...usagePresetRange('7d', Date.now()),
                tenantId: '2',
            },
            expect.any(AbortSignal),
        )
        vi.useRealTimers()
    })

    it('rejects an inverted custom range before calling the API', async () => {
        render(<UsageTimeSummaryPanel userId="20" revision={0} />)
        await screen.findByText('15')
        fireEvent.click(screen.getByText('dsh.range.custom'))
        const inputs = screen.getAllByDisplayValue(/T/u)
        fireEvent.change(inputs[0], { target: { value: '2026-09-15T12:00' } })
        fireEvent.change(inputs[1], { target: { value: '2026-09-14T12:00' } })
        fireEvent.click(screen.getByText('dsh.applyRange'))
        expect(screen.getByRole('alert').textContent).toBe('dsh.invalidRange')
        await waitFor(() => expect(getDshUsageTimeSummary).toHaveBeenCalledTimes(1))
    })
})
