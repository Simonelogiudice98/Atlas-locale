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

const ChatComposer = ({ onSend,isLoading }: ChatComposerProps) => {
  const [textAreaValue, setTextAreaValue] = useState<string>("");

  const onValueChange = (value: string) => {
    setTextAreaValue(value);
  };

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = textAreaValue.trim();
    if(text === ""){
        return
    }
    onSend(text);
    setTextAreaValue("");
  };

  return (
    <div className="grid w-full gap-6 shrink-0">
      <form onSubmit={onSubmit}>
        <InputGroup>
          <TextareaAutosize
            data-slot="input-group-control"
            className="flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
            value={textAreaValue}
            onChange={(event) => onValueChange(event.target.value)}
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
              Invio
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
};

export default ChatComposer;
