import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { SendButton } from '~/components/chat/SendButton.client';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';

export interface MessageInputProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  input?: string;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSendMessage?: (event: React.UIEvent) => void;
  handleStop?: () => void;
  hasPendingMessage?: boolean;
  chatStarted?: boolean;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
  minHeight?: number;
  maxHeight?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  textareaRef,
  input = '',
  handleInputChange = () => {},
  handleSendMessage = () => {},
  handleStop = () => {},
  hasPendingMessage = false,
  chatStarted = false,
  uploadedFiles = [],
  setUploadedFiles = () => {},
  imageDataList = [],
  setImageDataList = () => {},
  isListening = false,
  onStartListening = () => {},
  onStopListening = () => {},
  minHeight = 76,
  maxHeight = 200,
}) => {
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64Image = e.target?.result as string;
          setUploadedFiles([...uploadedFiles, file]);
          setImageDataList([...imageDataList, base64Image]);
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;

    if (!items) {
      return;
    }

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles([...uploadedFiles, file]);
            setImageDataList([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }

        break;
      }
    }
  };

  return (
    <div className={classNames('relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg')}>
      <textarea
        ref={textareaRef}
        className={classNames(
          'w-full pl-4 pt-4 pr-25 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
          'transition-all duration-200',
          'hover:border-bolt-elements-focus',
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.currentTarget.style.border = '2px solid #1488fc';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.border = '2px solid #1488fc';
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

          const files = Array.from(e.dataTransfer.files);
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();

              reader.onload = (e) => {
                const base64Image = e.target?.result as string;
                setUploadedFiles([...uploadedFiles, file]);
                setImageDataList([...imageDataList, base64Image]);
              };
              reader.readAsDataURL(file);
            }
          });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            if (event.shiftKey) {
              return;
            }

            event.preventDefault();

            if (hasPendingMessage) {
              handleStop();
              return;
            }

            if (event.nativeEvent.isComposing) {
              return;
            }

            handleSendMessage(event);
          }
        }}
        value={input}
        onChange={handleInputChange}
        onPaste={handlePaste}
        style={{
          minHeight,
          maxHeight,
        }}
        placeholder={chatStarted ? 'How can we help you?' : 'What do you want to build?'}
        translate="no"
      />
      <ClientOnly>
        {() => (
          <SendButton
            show={(hasPendingMessage || input.length > 0 || uploadedFiles.length > 0) && chatStarted}
            hasPendingMessage={hasPendingMessage}
            onClick={(event) => {
              if (hasPendingMessage) {
                handleStop();
                return;
              }

              if (input.length > 0 || uploadedFiles.length > 0) {
                handleSendMessage(event);
              }
            }}
          />
        )}
      </ClientOnly>
      <div className="flex justify-between items-center text-sm p-4 pt-2">
        <div className="flex gap-1 items-center">
          <IconButton title="Upload file" className="transition-all" onClick={handleFileUpload}>
            <div className="i-ph:paperclip text-xl"></div>
          </IconButton>

          <SpeechRecognitionButton
            isListening={isListening}
            onStart={onStartListening}
            onStop={onStopListening}
            disabled={hasPendingMessage}
          />
        </div>
        {input.length > 3 ? (
          <div className="text-xs text-bolt-elements-textTertiary">
            Use <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd> +{' '}
            <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd> a new line
          </div>
        ) : null}
      </div>
    </div>
  );
};
