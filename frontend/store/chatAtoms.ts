import { Message } from "@/types/chat";
import { atom, createStore } from "jotai";


const messagesAtom = atom<Message[]>([]);