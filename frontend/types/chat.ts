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
