'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AccountSetupWalkthrough from './AccountSetupWalkthrough';

export default function OnboardingController() {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || '');

        // Master admin (cesare@arkitecna.com) bypasses onboarding automatically
        const isMasterAdmin =
          user.email?.toLowerCase() === 'cesare@arkitecna.com' ||
          user.email?.toLowerCase() === 'admin@arkitecna.com';

        if (isMasterAdmin) return;

        // Check user_settings table or user metadata
        const metadataCompleted = user.user_metadata?.onboarding_completed;
        if (metadataCompleted) return;

        // Verify from user_settings table
        const { data: userSet } = await supabase
          .from('user_settings')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userSet || !userSet.onboarding_completed) {
          setShowWalkthrough(true);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
      }
    }

    checkOnboardingStatus();

    // Listen for manual trigger from settings page
    const handleManualOpen = () => {
      setShowWalkthrough(true);
    };

    window.addEventListener('open-onboarding-walkthrough', handleManualOpen);
    return () => {
      window.removeEventListener('open-onboarding-walkthrough', handleManualOpen);
    };
  }, []);

  if (!showWalkthrough) return null;

  return (
    <AccountSetupWalkthrough
      userEmail={userEmail}
      initialName={userName}
      onComplete={() => setShowWalkthrough(false)}
      isOpen={showWalkthrough}
    />
  );
}
