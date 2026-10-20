import { Button } from '@/components/bs-ui/button'
import { getModelListApi } from '@/controllers/API/finetune'
import { userContext } from '@/contexts/userContext'
import { useDshBrowserConfig } from '@/hooks/useDshBrowserConfig'
import { DshDesktopModelConfig } from '@/pages/ModelPage/manage/dsh/DshDesktopModelConfig'
import type { DshSection } from '@/pages/DshPage/sections'
import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditRulesView } from './CreditRulesView'
import { PolicyView } from './PolicyView'
import { SettingsPanel } from './SettingsPanel'

export function DshManagement({ section = 'usage', usageToolbarTarget }: {
    section?: DshSection; usageToolbarTarget?: HTMLDivElement | null
}) {
    const { t } = useTranslation()
    const { user } = useContext(userContext)
    const { config, failed } = useDshBrowserConfig()
    if (!config) return <p role={failed ? 'alert' : 'status'}>{t(failed ? 'dsh.unavailable' : 'dsh.loading')}</p>
    if (!config.management_enabled) return <p>{t('dsh.managementUnavailable')}</p>
    const activeSection = config.enabled ? section : 'access'
    return <div className="h-full overflow-auto px-6 py-5">
        {activeSection === 'usage' && <div className="space-y-6">
            <CreditRulesView />
            <PolicyView toolbarTarget={usageToolbarTarget} />
        </div>}
        {activeSection === 'models' && <DshModelsView />}
        {activeSection === 'access' && <SettingsPanel settings={config} canEdit={user?.role === 'admin' || !!user?.is_global_super} />}
    </div>
}

function DshModelsView() {
    const { t } = useTranslation()
    const [data, setData] = useState<Parameters<typeof DshDesktopModelConfig>[0]['data'] | null>(null)
    const [error, setError] = useState(false)
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        let cancelled = false
        setData(null)
        setError(false)
        getModelListApi()
            .then((value) => {
                if (!cancelled) setData(value)
            })
            .catch(() => {
                if (!cancelled) setError(true)
            })
        return () => {
            cancelled = true
        }
    }, [revision])

    if (!data) {
        return (
            <div className="space-y-3">
                <p role={error ? 'alert' : 'status'}>
                    {t(error ? 'dsh.modelsUnavailable' : 'dsh.loading')}
                </p>
                {error && (
                    <Button
                        variant="outline"
                        onClick={() => setRevision((old) => old + 1)}
                    >
                        {t('dsh.refresh')}
                    </Button>
                )}
            </div>
        )
    }

    return <DshDesktopModelConfig data={data} />
}
