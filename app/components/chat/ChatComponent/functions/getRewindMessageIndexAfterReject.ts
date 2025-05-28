import type { Message } from '~/lib/persistence/message';

function getRewindMessageIndexAfterReject(messages: Message[], messageId: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const { id, role, repositoryId } = messages[i];
    if (role == 'user') {
      return i;
    }
    if (repositoryId && id != messageId) {
      return i;
    }
  }

  console.error('No rewind message found', messages, messageId);
  return -1;
}

export default getRewindMessageIndexAfterReject;
