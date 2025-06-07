import { json, type MetaFunction } from '~/lib/remix-types';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
import { Chat } from '~/components/chat/ChatComponent/Chat.client';
import { Starfield } from '~/components/ui/Starfield';
export const meta: MetaFunction = () => {
  return [{ title: 'Nut' }];
};

export const loader = () => json({});

export default function Index() {
  return (
    <Starfield className="flex flex-col h-full w-full">
      {/* <Header /> will be added next */}
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </Starfield>
  );
}
