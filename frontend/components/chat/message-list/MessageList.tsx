import { Message } from "@/types/chat";
import ChatMessage from "./ChatMessage";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: MessageListProps) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 py-8">
      {messages.map((message) => {
        return <ChatMessage key={message.id} message={message} />;
      })}
      {isLoading && (
        <Bubble align="start" variant="secondary">
          <BubbleContent>
            <div role="status">
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-2 rounded-full bg-current animate-bounce" />
                <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="sr-only">Atlas sta rispondendo…</span>
            </div>
          </BubbleContent>
        </Bubble>
      )}
    </div>
  );
};

export default MessageList;
