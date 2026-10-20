import { bsConfirm } from '@/components/bs-ui/alertDialog/useConfirm'
import { Button } from '@/components/bs-ui/button'
import { Checkbox } from '@/components/bs-ui/checkBox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/bs-ui/dialog'
import type { DepartmentUserOption } from '@/components/bs-comp/selectComponent/DepartmentUsersSelect'
import {
    getModelVisibility, getPolicySubjects, saveModelVisibility,
    type ModelVisibility, type PolicySubjectOption,
} from '@/controllers/API/dshUnified'
import { getDshRequestErrorKey } from '@/utils/dshRequestError'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PolicyScopePicker } from './PolicyScopePicker'

export type DshAccessModel = { id: number; name: string }
interface ModelAccessDialogProps {
    model: DshAccessModel | null
    onClose: () => void
}

export function ModelAccessDialog({ model, onClose }: ModelAccessDialogProps) {
    const { t } = useTranslation()
    const [value, setValue] = useState<ModelVisibility | null>(null)
    const [options, setOptions] = useState<PolicySubjectOption[]>([])
    const [users, setUsers] = useState<DepartmentUserOption[]>([])
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [revision, setRevision] = useState(0)
    const modelId = model?.id

    useEffect(() => {
        setValue(null)
        setDirty(false)
        setError(null)
        if (!modelId) return
        const abort = new AbortController()
        Promise.all([getModelVisibility(modelId, abort.signal), getPolicySubjects(abort.signal)])
            .then(([policy, subjects]) => {
                if (abort.signal.aborted) return
                setValue(policy)
                setOptions(subjects)
                setUsers(policy.users ?? [])
            })
            .catch(() => { if (!abort.signal.aborted) setError('dsh.unavailable') })
        return () => abort.abort()
    }, [modelId, revision])

    const close = () => {
        if (saving) return
        if (!dirty) { onClose(); return }
        bsConfirm({
            title: t('dsh.discardPolicyEdits'), desc: t('dsh.discardPolicyEditsHelp'),
            okTxt: t('dsh.discardEdits'), onOk(next) { onClose(); next() },
        })
    }
    const save = async () => {
        if (!modelId || !value || saving) return
        setSaving(true)
        setError(null)
        try {
            await saveModelVisibility(modelId, value)
            setDirty(false)
            onClose()
        } catch (reason) {
            setError(getDshRequestErrorKey(reason) ?? 'dsh.unavailable')
        } finally { setSaving(false) }
    }

    return <Dialog open={!!model} onOpenChange={open => { if (!open) close() }}>
        <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{t('dsh.unified.visibility')} · {model?.name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{t('dsh.unified.visibilityHelp')}</p>
            {error && <p role="alert">{t(error)}</p>}
            {!value ? <Button variant="outline" onClick={() => setRevision(old => old + 1)}>
                {t(error ? 'dsh.refresh' : 'dsh.loading')}
            </Button> : <>
                <label className="flex items-center gap-2">
                    <Checkbox checked={value.everyone} disabled={saving} onCheckedChange={checked => {
                        setValue({ ...value, everyone: checked === true }); setDirty(true)
                    }} />
                    {t('dsh.unified.everyone')}
                </label>
                {!value.everyone && <PolicyScopePicker options={options} value={value.subjects}
                    users={users} onUsersChange={setUsers} disabled={saving}
                    onChange={subjects => { setValue({ ...value, subjects }); setDirty(true) }} />}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close} disabled={saving}>{t('dsh.unified.cancel')}</Button>
                    <Button onClick={save} disabled={saving || !dirty}>
                        {t(saving ? 'dsh.unified.saving' : 'dsh.unified.save')}
                    </Button>
                </div>
            </>}
        </DialogContent>
    </Dialog>
}
