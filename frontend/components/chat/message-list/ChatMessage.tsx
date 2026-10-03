import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message } from "@/types/chat";

interface IChatMessageProps {
    message:Message;
}

const ChatMessage = ({message}:IChatMessageProps) => {

  return (
    <Bubble align={message.role == 'user' ? "end" :"start" } variant={message.role == 'user' ? "default" :"secondary"}>
        <BubbleContent className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</BubbleContent>
      </Bubble>
  );
  
};

export default ChatMessage;