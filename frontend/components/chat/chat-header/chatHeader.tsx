import { Button } from "@/components/ui/button";
import { Compass, Menu } from "lucide-react";

type Props = { title: string; onOpenSidebar: () => void };

export default function ChatHeader({ title, onOpenSidebar }: Props) {
  return (
    <header className="flex h-[73px] shrink-0 items-center gap-3 border-b border-border/50 px-4 sm:px-6">
      <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={onOpenSidebar} aria-label="Apri cronologia"><Menu /></Button>
      <Compass className="hidden size-4 shrink-0 text-[#C3A574] md:block" aria-hidden="true" />
      <h1 className="truncate text-sm font-medium tracking-tight">{title}</h1>
    </header>
  );
}
