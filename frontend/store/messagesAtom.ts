import { Message } from "@/types/chat";
import { atom } from "jotai";


export const messagesAtom = atom<Message[]>([]);