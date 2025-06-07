import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { useEffect, useState } from 'react';
import { Backdrop } from '~/components/ui/Backdrop';
import { motion, AnimatePresence } from 'framer-motion';
import { cubicEasingFn } from '~/utils/easings';
import { toast } from 'react-toastify';
import { PromptCounter } from '~/components/prompt/PromptCounter.client';
import { useIsMobile } from '../../utils/deviceDetection';

const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    x: '100%',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'visible',
    x: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} as const;

export function Header() {
  const chat = useStore(chatStore);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [phantomError, setPhantomError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Function to update all wallet address displays in the UI
  const updateWalletDisplays = (address: string | null) => {
    console.log('Updating wallet displays:', address ? shortAddress(address) : 'disconnected');
    
    // Update all full wallet address displays
    document.querySelectorAll('[data-wallet-address]').forEach(element => {
      if (address) {
        element.textContent = address;
      } else {
        element.textContent = '';
      }
    });
    
    // Update all shortened wallet address displays
    document.querySelectorAll('[data-wallet-address-short]').forEach(element => {
      if (address) {
        element.textContent = shortAddress(address);
      } else {
        element.textContent = '';
      }
    });
    
    // Update wallet connection state for conditional UI elements
    const isConnected = !!address;
    document.querySelectorAll('[data-wallet-connected]').forEach(el => {
      if (isConnected) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
    
    document.querySelectorAll('[data-wallet-disconnected]').forEach(el => {
      if (isConnected) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });
  };

  // Try to auto-connect to wallet on component mount
  useEffect(() => {
    // Try to auto-connect to Phantom wallet if it exists
    const tryEagerConnect = async () => {
      try {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          // Set connecting flag to show loading state
          setConnecting(true);
          
          // Attempt to connect
          await solana.connect({ onlyIfTrusted: true });
          
          // Get the connected wallet public key
          const publicKey = solana.publicKey.toString();
          console.log('Auto-connected to Phantom:', publicKey);
          
          // Update state and store
          setConnecting(false);
          setWalletAddress(publicKey);
          chatStore.setKey('wallet', solana);
        }
      } catch (error) {
        console.log('Auto-connect failed:', error);
        setConnecting(false);
      }
    };
    
    tryEagerConnect();
  }, []);
  
  // Monitor wallet address changes and update UI accordingly
  useEffect(() => {
    updateWalletDisplays(walletAddress);
  }, [walletAddress]);

  // Add direct DOM event handler as a fallback for React synthetic events
  useEffect(() => {
    // Add direct DOM event listener to the wallet connect button
    const addDirectClickHandler = () => {
      setTimeout(() => {
        const connectButton = document.getElementById('connect-wallet-button');
        if (connectButton) {
          console.log('Adding direct click handler to connect button');
          
          // Remove any existing event listeners first to prevent duplicates
          const newButton = connectButton.cloneNode(true);
          if (connectButton.parentNode) {
            connectButton.parentNode.replaceChild(newButton, connectButton);
          }
          
          // Add fresh event listener
          newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Connect button clicked via direct DOM handler');
            if (walletAddress) {
              console.log('DOM handler: Already connected, showing menu');
              setShowConnectMenu(true);
              // Don't reconnect if already connected
            } else {
              console.log('DOM handler: Not connected, connecting wallet');
              connectWallet();
            }
          });
          
          // Update wallet display if needed
          const shortAddressElement = (newButton as HTMLElement).querySelector('[data-wallet-address-short]');
          if (shortAddressElement && walletAddress) {
            shortAddressElement.textContent = shortAddress(walletAddress);
          }
        } else {
          console.log('Connect button not found in DOM');
        }
      }, 500); // Give React time to render the button
    };
    
    addDirectClickHandler();
  }, [walletAddress]); // Re-add handler when wallet address changes

  const connectWallet = async () => {
    console.log('Connect to Phantom wallet function called');
    // Check if window is defined (client-side only)
    if (typeof window === 'undefined') {
      console.error('Window is not defined, cannot connect wallet');
      return;
    }
    
    // Handle potential wallet conflicts
    // Save original ethereum provider if it exists to prevent conflicts
    try {
      if ((window as any).ethereum) {
        console.log('Found existing Ethereum provider, backing it up temporarily');
        // Create backup of ethereum provider to restore after Phantom connection
        (window as any)._originalEthereumProvider = (window as any).ethereum;
      }
    } catch (err) {
      console.warn('Error handling ethereum provider:', err);
    }
    
    // Access Phantom wallet after handling potential conflicts
    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom) {
      const errorMsg = 'Phantom wallet not found! Please install the Phantom extension.';
      console.error(errorMsg);
      setPhantomError(errorMsg);
      alert(errorMsg);
      return;
    }
    
    setConnecting(true);
    console.log('Connecting to Phantom...');
    
    try {
      // Force disconnect first to ensure a fresh connection
      try {
        await solana.disconnect();
        console.log('Disconnected existing Phantom session before reconnecting');
      } catch (disconnectError) {
        console.warn('No existing Phantom session to disconnect or error during disconnect:', disconnectError);
      }

      // Attempt to connect
      await solana.connect();
      
      // Get the connected wallet public key
      const publicKey = solana.publicKey.toString();
      console.log('Connected to Phantom:', publicKey);
      
      // Update state and store
      setConnecting(false);
      setWalletAddress(publicKey);
      chatStore.setKey('wallet', solana);
      setShowConnectMenu(true); // Show menu after successful connection
      setPhantomError(null); // Clear any previous errors
      
      // Restore original ethereum provider if it was backed up
      if ((window as any)._originalEthereumProvider) {
        console.log('Restoring original Ethereum provider');
        (window as any).ethereum = (window as any)._originalEthereumProvider;
        delete (window as any)._originalEthereumProvider;
      }
      
    } catch (error: any) {
      console.error('Error connecting to Phantom:', error);
      setConnecting(false);
      
      let errorMessage = 'Failed to connect to Phantom wallet.';
      if (error.message) {
        errorMessage += ` ${error.message}`;
      }
      
      setPhantomError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
    }
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting Phantom wallet');
    const solana = (window as any).solana;
    if (solana?.isPhantom && solana.isConnected) {
      try {
        await solana.disconnect();
        console.log('Disconnected from Phantom');
        setWalletAddress(null);
        chatStore.setKey('wallet', null);
        setShowConnectMenu(false);
        setPhantomError(null);
      } catch (error) {
        console.error('Error disconnecting from Phantom:', error);
        toast.error('Error disconnecting wallet.');
      }
    }
  };

  const switchWallet = async () => {
    console.log('Switching Phantom wallet');
    const solana = (window as any).solana;
    if (solana?.isPhantom) {
      try {
        // Disconnect current wallet
        await solana.disconnect();
        setWalletAddress(null);
        chatStore.setKey('wallet', null);
        
        // Re-connect, which should prompt user to select account if multiple are available
        await solana.connect();
        const publicKey = solana.publicKey.toString();
        console.log('Switched to Phantom wallet:', publicKey);
        
        setWalletAddress(publicKey);
        chatStore.setKey('wallet', solana);
        setPhantomError(null);
      } catch (error) {
        console.error('Error switching Phantom wallet:', error);
        toast.error('Error switching wallet.');
      }
    }
  };

  // Helper to shorten address
  const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleSidebarToggle = () => {
    // This function seems to be a placeholder or for a different sidebar
    // The wallet menu is controlled by showConnectMenu
    console.log('Sidebar toggle clicked');
  };

  return (
    <header className="relative z-[100] flex items-center justify-between h-[var(--header-height)] px-4 md:px-6">
      {/* Left section: Logo and Chat Info */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-white font-semibold text-lg">
          <img src="/logo_mark.svg" alt="Romeo Logo" className="w-7 h-7 md:w-8 md:h-8" />
          <span className="hidden sm:inline">Romeo</span>
        </a>
        {/* Divider */}
        <div className="h-5 w-px bg-bolt-elements-borderColor hidden md:block" />
        {/* Chat Info */}
        <ClientOnly fallback={null}>
          {() => (
            <ChatDescription 
              chatId={chat?.id} 
              title={chat?.title} 
              model={chat?.model}
              className="hidden md:flex items-center gap-2 text-sm text-bolt-elements-textSecondary"
            />
          )}
        </ClientOnly>
      </div>

      {/* Right section: Action Buttons and Wallet */}
      <div className="flex items-center gap-2 md:gap-3">
        <ClientOnly fallback={null}>{() => <HeaderActionButtons />}</ClientOnly>
        
        {/* Wallet Connect Button */}
        <button
          id="connect-wallet-button"
          className={classNames(
            'flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-medium transition-colors text-xs md:text-sm',
            'bg-bolt-elements-background-primary border border-bolt-elements-borderColor hover:bg-bolt-elements-background-secondary active:bg-bolt-elements-background-secondary',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-accent focus-visible:ring-opacity-75'
          )}
          onClick={() => {
            console.log('Wallet button clicked (React handler)');
            if (walletAddress) {
              setShowConnectMenu(true);
            } else {
              connectWallet();
            }
          }}
        >
          <div 
            className={classNames(
              'i-ph:wallet text-base md:text-lg',
              walletAddress ? 'text-green-500' : 'text-bolt-elements-textSecondary'
            )} 
          />
          <span 
            className="hidden sm:inline text-bolt-elements-textPrimary"
            data-wallet-address-short // For direct DOM update
          >
            {walletAddress ? shortAddress(walletAddress) : 'Connect Wallet'}
          </span>
        </button>
      </div>

      {/* Wallet Connection Menu/Sidebar */}
      <AnimatePresence>
        {showConnectMenu && (
          <>
            <Backdrop isOpen={showConnectMenu} onClose={() => setShowConnectMenu(false)} />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="fixed inset-y-0 right-0 w-full md:w-[350px] h-full bg-bolt-elements-background-depth-2 border-l rounded-none md:rounded-l-3xl border-bolt-elements-borderColor z-50 shadow-xl shadow-bolt-elements-sidebar-dropdownShadow text-sm flex flex-col"
            >
              <div className="flex items-center justify-between h-[var(--header-height)] px-4 md:px-6 border-b border-bolt-elements-borderColor">
                <span className="font-semibold text-lg">Wallet</span>
                <button 
                  onClick={() => setShowConnectMenu(false)}
                  className="p-2 rounded-md hover:bg-bolt-elements-background-depth-3 transition-colors"
                >
                  <div className="i-ph:x text-lg" />
                </button>
              </div>
              <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
                {!walletAddress ? (
                  <button
                    className={classNames(
                      'mb-4 px-4 py-2 rounded-full font-semibold text-white bg-[#ce6a1e] transition-colors hover:bg-[#b85d19]',
                      connecting ? 'opacity-70 cursor-wait' : ''
                    )}
                    onClick={connectWallet}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : 'Connect to Phantom'}
                  </button>
                ) : (
                  <>
                    <div className="mb-4 p-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor">
                      <div className="text-sm text-bolt-elements-textSecondary mb-2">Connected Wallet</div>
                      <div 
                        id="connected-wallet-address"
                        data-wallet-address // For direct DOM update
                        className="font-mono text-bolt-elements-textPrimary break-all text-xs md:text-sm"
                      >
                        {walletAddress}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="px-3 md:px-4 py-2 rounded-md font-medium text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:bg-bolt-elements-sidebar-buttonBackgroundHover active:bg-bolt-elements-sidebar-buttonBackgroundHover transition-colors text-xs md:text-sm"
                        onClick={switchWallet}
                      >
                        Switch Wallet
                      </button>
                      <button
                        className="px-3 md:px-4 py-2 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors text-xs md:text-sm"
                        onClick={disconnectWallet}
                      >
                        Sign Out
                      </button>
                    </div>
                    
                    {/* Prompt counter display */}
                    <div className="mt-6 p-4 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor">
                      <div className="text-sm text-bolt-elements-textSecondary mb-3">Available Credits</div>
                      <ClientOnly fallback={<div className="flex items-center gap-1"><div className="i-ph:coin text-sm" /></div>}>
                        {() => <PromptCounter chatStarted={true} />}
                      </ClientOnly>
                    </div>
                  </>
                )}
                {phantomError && (
                  <div className="text-red-500 mt-2">{phantomError}</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
