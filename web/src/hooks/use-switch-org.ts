import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getToken, useOrganization, useOrganizationList } from '@clerk/react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';

type Phase = 'idle' | 'switching' | 'loading';

// Safety net so a hung query can never leave the loading state stuck.
const LOADING_TIMEOUT_MS = 10_000;

// Switches the active org in the Clerk session (the token then carries the new
// org) without a page reload, and stays "switching" until the new org's data
// has loaded.
export function useSwitchOrg() {
  const { organization } = useOrganization();
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const isFetching = useIsFetching();
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const handleSwitchOrg = useCallback(
    async (organizationId: string) => {
      if (
        !setActive ||
        phaseRef.current !== 'idle' ||
        organizationId === organization?.id
      ) {
        return;
      }
      updatePhase('switching');
      try {
        await setActive({ organization: organizationId });
        // Warm Clerk's token cache with the new-org token so refetches don't
        // send a stale token from the previous org.
        await getToken({ skipCache: true });
        // resetQueries (unlike clear) makes mounted observers refetch.
        await queryClient.resetQueries();
        await router.invalidate();
        await navigate({ to: '/ledger-books' });
        updatePhase('loading');
      } catch (error) {
        updatePhase('idle');
        throw error;
      }
    },
    [setActive, organization?.id, queryClient, router, navigate, updatePhase],
  );

  useEffect(() => {
    if (phase !== 'loading') return;
    if (isFetching === 0) {
      updatePhase('idle');
      return;
    }
    const timeout = setTimeout(() => updatePhase('idle'), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [phase, isFetching, updatePhase]);

  const orgs = useMemo(
    () => userMemberships.data?.map((m) => m.organization) ?? [],
    [userMemberships.data],
  );

  return {
    activeOrg: organization,
    orgs,
    isSwitching: phase !== 'idle',
    handleSwitchOrg,
  };
}
