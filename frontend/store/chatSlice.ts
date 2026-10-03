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
        messageAdded(state, action:PayloadAction<Message>){
            state.messages.push(action.payload);
        }
    }
})

export const {messageAdded} = chatSlice.actions;
export default chatSlice.reducer; 