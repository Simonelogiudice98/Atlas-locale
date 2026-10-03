import { Button } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";

const ChatHeader = () => {
  return (
    <header className="flex items-center justify-between shrink-0 border-b border-border px-5 py-4">
      <div className="flex items-center gap-2">
      <Compass className="size-5 text-[#C3A574]" aria-hidden="true"/>
      <h1 className="text-base font-semibold tracking-tight text-foreground">Atlas</h1>
      </div>
      <Button type="button" variant="outline" size="sm">
        <Plus />
        Nuova chat
      </Button>
    </header>
  );
};

export default ChatHeader;
