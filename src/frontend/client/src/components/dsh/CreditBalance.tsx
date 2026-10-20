import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDshBrowserConfig, getDshCredits } from '~/api/dsh';
import { useAuthContext, useLocalize } from '~/hooks';

export function CreditBalance({ running }: { running: boolean }) {
    const localize = useLocalize();
    const { user, isAuthenticated } = useAuthContext();
    const enabled = isAuthenticated && !!user?.id;
    const config = useQuery(['dsh-browser-config', user?.id], ({ signal }) => getDshBrowserConfig(signal), { staleTime: 60000, enabled });
    const balance = useQuery(['dsh-personal-credits', user?.id], ({ signal }) => getDshCredits(signal), {
        enabled: enabled && config.data?.enabled === true,
        refetchInterval: 15000,
        refetchOnWindowFocus: true,
    });
    const { refetch } = balance;
    useEffect(() => { if (enabled && !running && config.data?.enabled) void refetch(); }, [enabled, running, config.data?.enabled, refetch]);
    if (!enabled || !config.data?.enabled) return null;
    const remaining = balance.data?.remaining;
    const available = !balance.isError && remaining != null;
    return <span className="whitespace-nowrap text-caption text-text-3" role="status" title={localize('dsh.credits.help')}>
        {available ? localize('dsh.credits.balance', { value: remaining }) : localize('dsh.credits.unavailable')}
    </span>;
}
