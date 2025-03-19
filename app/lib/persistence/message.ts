// Client messages match the format used by the Nut protocol.

type MessageRole = 'user' | 'assistant';

interface MessageBase {
  id: string;
  role: MessageRole;
  repositoryId?: string;
}

interface MessageText extends MessageBase {
  type: 'text';
  content: string;
}

interface MessageImage extends MessageBase {
  type: 'image';
  dataURL: string;
}

export type Message = MessageText | MessageImage;
