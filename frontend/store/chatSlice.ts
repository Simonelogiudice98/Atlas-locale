import type { Message } from "@/types/chat";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ChatState = {
    messages:Message[];
}

const initialState:ChatState = {
    messages:[]
}

const chatSlice = createSlice({
    name:"chatReducer",
    initialState,
    reducers:{
        messagesReplaced(state, action:PayloadAction<Message[]>){
            state.messages = action.payload;
        },
        messageAdded(state, action:PayloadAction<Message>){
            state.messages.push(action.payload);
        },
        messageUpdated(state, action:PayloadAction<{id:string; content:string}>){
            const message = state.messages.find(message => message.id === action.payload.id);
            if (message) message.content = action.payload.content;
        }
    }
})

export const {messageAdded, messageUpdated, messagesReplaced} = chatSlice.actions;
export default chatSlice.reducer;
