import type { Message, MessageImage, MessageText } from '~/lib/persistence/message';
import type { ResumeChatInfo } from '~/lib/persistence/useChatHistory';
import type { RejectChangeData } from '~/components/chat/ApproveChange';

export interface ChatProps {
  initialMessages: Message[];
  resumeChat: ResumeChatInfo | undefined;
  storeMessageHistory: (messages: Message[]) => void;
}

export interface ChatImplProps extends ChatProps {
  onApproveChange?: (messageId: string) => Promise<void>;
  onRejectChange?: (messageId: string, data: RejectChangeData) => Promise<void>;
}

// Re-export types we need
export type { Message, MessageImage, MessageText, ResumeChatInfo };

export interface UserMessage extends MessageText {
  role: 'user';
  type: 'text';
}

export interface UserImageMessage extends MessageImage {
  role: 'user';
  type: 'image';
}
