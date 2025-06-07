import { useStore } from '@nanostores/react';
import { supabasePaymentStore, refreshBalance } from '~/lib/stores/supabasePayment';
import { ClientOnly } from 'remix-utils/client-only';
import { useState, useEffect } from 'react';
import { chatStore } from '~/lib/stores/chat';

/**
 * Inner component to display the prompt count status
 * Always shows the global number of prompts available
 */
interface PromptCounterInnerProps {
  chatStarted: boolean;
}

function PromptCounterInner({ chatStarted }: PromptCounterInnerProps) {
  const payment = useStore(supabasePaymentStore);
  const chat = useStore(chatStore);
  const [availablePrompts, setAvailablePrompts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh balance when wallet changes or on component mount
  useEffect(() => {
    const refreshWalletBalance = async () => {
      setIsLoading(true);
      try {
        // Get wallet from chat store if available, otherwise from payment store
        const walletAddress = chat.wallet?.publicKey?.toString() || payment.connectedWallet;
        if (walletAddress) {
          console.log('Refreshing balance for wallet:', walletAddress);
          await refreshBalance(walletAddress);
          
          // Show toast on successful balance refresh
          // toast.info('Balance updated');
        }
      } catch (error) {
        console.error('Error refreshing balance in PromptCounter:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Immediately refresh on mount or wallet change
    refreshWalletBalance();
    
    // Set up interval to refresh balance
    const intervalId = setInterval(refreshWalletBalance, 15000); // every 15 seconds
    
    return () => clearInterval(intervalId);
  }, [chat.wallet?.publicKey, payment.connectedWallet]);

  // Update local state when store changes
  useEffect(() => {
    if (payment.globalPromptsAvailable !== availablePrompts) {
      setAvailablePrompts(payment.globalPromptsAvailable);
      console.log('Prompt counter updated, prompts available:', payment.globalPromptsAvailable);
    }
  }, [payment.globalPromptsAvailable]);

    if (!chatStarted) {
    return (
      <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded bg-neutral-900/5 text-green-400">
        <div className="i-ph:sparkle text-sm" />
        <span>First prompt is free!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded bg-bolt-elements-item-backgroundAccent text-bolt-elements-textSecondary whitespace-nowrap">
      <div className="i-ph:coin text-sm" />
      <span>
        {isLoading ? 'Loading...' : `${availablePrompts} message${availablePrompts !== 1 ? 's' : ''} remaining`}
      </span>
    </div>
  );
}

// Export a wrapped version that only renders on the client
interface PromptCounterProps {
  chatStarted: boolean;
}
export function PromptCounter({ chatStarted }: PromptCounterProps) {
  return (
    <ClientOnly fallback={<div className="flex items-center gap-1"><div className="i-ph:coin text-sm" /></div>}>
      {() => <PromptCounterInner chatStarted={chatStarted} />}
    </ClientOnly>
  );
}
