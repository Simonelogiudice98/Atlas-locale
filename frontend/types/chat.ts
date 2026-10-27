export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  message: {
    role: "assistant";
    content: string;
  };
};

export type ChatErrorResponse = {
  error:{
    code:string;
    message:string;
  }
}
export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
