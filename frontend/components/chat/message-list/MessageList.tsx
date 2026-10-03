import { type Message } from "@/types/chat";
import ChatMessage from "./ChatMessage";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Compass } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: MessageListProps) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 py-8 px-4 sm:px-6">
      {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
              <Compass className="size-8 text-[#C3A574]" aria-hidden="true"/>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Da dove iniziamo?</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Un dubbio, un’idea o qualcosa da capire: chiedi ad Atlas.</p>
          </div>
      )

      }
      {messages.map((message) => {
        return <ChatMessage key={message.id} message={message} />;
      })}
      {isLoading && (
        <Bubble align="start" variant="secondary">
          <BubbleContent>
            <div role="status" className="flex items-center gap-3">
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-2 rounded-full bg-current animate-bounce" />
                <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm text-muted-foreground">Sto pensando…</span>
            </div>
          </BubbleContent>
        </Bubble>
      )}
    </div>
  );
};

export default MessageList;
