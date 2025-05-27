/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { cssTransition, ToastContainer } from 'react-toastify';
import {  useChatHistory } from '~/lib/persistence';
import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import flushSimulationData from './functions/flushSimulation';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

setInterval(async () => {
  flushSimulationData();
}, 1000);

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, resumeChat, storeMessageHistory } = useChatHistory();

  return (
    <>
      {ready && (
        <ChatImplementer initialMessages={initialMessages} resumeChat={resumeChat} storeMessageHistory={storeMessageHistory} />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}
