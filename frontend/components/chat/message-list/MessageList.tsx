import { Message } from "@/types/chat";
import ChatMessage from "./ChatMessage";

interface MessageListProps {
  messages: Message[];
}

const MessageList = ({ messages }: MessageListProps) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 py-8">
      {messages.map((message) => {
        return <ChatMessage key={message.id} message={message} />;
      })}
    </div>
  );
};

export default MessageList;
