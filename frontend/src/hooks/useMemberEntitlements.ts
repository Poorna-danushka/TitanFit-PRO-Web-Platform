import { useState, useEffect, useCallback } from 'react';
import { trainerAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';

export interface PTPlanEntitlement {
  hasPersonalTrainerAccess: boolean;
  hasTrainer: boolean;
  planName: string | null;
  assignedTrainer: any | null;
  membership: any | null;
  loading: boolean;
  refreshEntitlements: () => Promise<void>;
}

export function useMemberEntitlements(): PTPlanEntitlement {
  const { user, isAuthenticated } = useAuth();
  const [hasPTAccess, setHasPTAccess] = useState<boolean>(false);
  const [hasTrainer, setHasTrainer] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [assignedTrainer, setAssignedTrainer] = useState<any | null>(null);
  const [membership, setMembership] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEntitlements = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setHasPTAccess(false);
      setHasTrainer(false);
      setPlanName(null);
      setAssignedTrainer(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await trainerAPI.getEligibility();
      const data = res.data;

      const isEligible = Boolean(data?.hasPersonalTrainerAccess || data?.isEligible);
      setHasPTAccess(isEligible);
      setHasTrainer(Boolean(data?.hasTrainer));
      setPlanName(data?.planName || null);
      setAssignedTrainer(data?.trainer || null);
      setMembership(data?.membership || null);
    } catch (err) {
      // If unauthorized or network error, default to no access
      setHasPTAccess(false);
      setHasTrainer(false);
      setPlanName(null);
      setAssignedTrainer(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  return {
    hasPersonalTrainerAccess: hasPTAccess,
    hasTrainer,
    planName,
    assignedTrainer,
    membership,
    loading,
    refreshEntitlements: fetchEntitlements,
  };
}
