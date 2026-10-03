"use client";
import TextareaAutosize from "react-textarea-autosize";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { useState } from "react";

interface ChatComposerProps {
  onSend: (value: string) => void;
  isLoading: boolean;
}

const ChatComposer = ({ onSend, isLoading }: ChatComposerProps) => {
  const [textAreaValue, setTextAreaValue] = useState<string>("");

  const onValueChange = (value: string) => {
    setTextAreaValue(value);
  };

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(isLoading) return
    const text = textAreaValue.trim();
    if (text === "") {
      return;
    }
    onSend(text);
    setTextAreaValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="grid w-full gap-2 shrink-0">
      <form onSubmit={onSubmit}>
        <InputGroup>
          <TextareaAutosize
            minRows={1}
            maxRows={6}
            data-slot="input-group-control"
            className="flex field-sizing-content placeholder:text-muted-foreground min-h-10 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
            value={textAreaValue}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chiedi qualcosa..."
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              className="ml-auto"
              size="sm"
              variant="default"
              type="submit"
              disabled={isLoading || textAreaValue.trim() === ""}
            >
              Invia
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Invio per inviare · Shift+Invio per andare a capo
      </p>
    </div>
  );
};

export default ChatComposer;
