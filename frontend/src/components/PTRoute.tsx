import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useMemberEntitlements } from '../hooks/useMemberEntitlements';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  children?: React.ReactNode;
}

export default function PTRoute({ children }: Props) {
  const { hasPersonalTrainerAccess, loading } = useMemberEntitlements();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasPersonalTrainerAccess) {
    // Non-eligible members attempting direct URL access are immediately redirected
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
