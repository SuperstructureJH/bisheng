import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ModelAccessDialog } from './ModelAccessDialog'
import { getModelVisibility, getPolicySubjects, saveModelVisibility } from '@/controllers/API/dshUnified'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/controllers/API/dshUnified', () => ({ getModelVisibility: vi.fn(), getPolicySubjects: vi.fn(), saveModelVisibility: vi.fn() }))
vi.mock('@/components/bs-comp/selectComponent/Users', () => ({ default: () => null }))
vi.mock('@/utils/dshRequestError', () => ({ getDshRequestErrorKey: () => 'dsh.conflict' }))
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getModelVisibility).mockResolvedValue({ version: 3, everyone: false, subjects: [] })
    vi.mocked(getPolicySubjects).mockResolvedValue([{ kind: 'DEPARTMENT', id: 10, name: 'Engineering', depth: 0 }, { kind: 'ROLE', id: 10, name: 'Reviewer', depth: 0 }])
})
it('saves model visibility independently of credit rules', async () => {
    const close = vi.fn()
    render(<ModelAccessDialog model={{ id: 7, name: 'Model' }} onClose={close} />)
    fireEvent.click(await screen.findByLabelText('Engineering'))
    fireEvent.click(screen.getByRole('button', { name: 'dsh.unified.save' }))
    await waitFor(() => expect(saveModelVisibility).toHaveBeenCalledWith(7, { version: 3, everyone: false, subjects: [{ kind: 'DEPARTMENT', id: 10 }] }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
})
it('keeps draft visible after a version conflict', async () => {
    vi.mocked(saveModelVisibility).mockRejectedValue(new Error('conflict'))
    const close = vi.fn()
    render(<ModelAccessDialog model={{ id: 7, name: 'Model' }} onClose={close} />)
    fireEvent.click(await screen.findByLabelText('Reviewer'))
    fireEvent.click(screen.getByRole('button', { name: 'dsh.unified.save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('dsh.conflict')
    expect(screen.getByLabelText('Reviewer')).toBeChecked()
    expect(close).not.toHaveBeenCalled()
})
it('everyone hides individual choices', async () => {
    render(<ModelAccessDialog model={{ id: 7, name: 'Model' }} onClose={vi.fn()} />)
    fireEvent.click(await screen.findByLabelText('dsh.unified.everyone'))
    expect(screen.queryByLabelText('Engineering')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'dsh.unified.save' }))
    await waitFor(() => expect(saveModelVisibility).toHaveBeenCalledWith(7, { version: 3, everyone: true, subjects: [] }))
})
