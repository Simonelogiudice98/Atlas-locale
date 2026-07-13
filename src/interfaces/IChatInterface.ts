
export interface RequestBody {
    model:string;
    messages:ChatMessage[];
    stream:boolean;
}

interface ChatMessage  {
    role:string;
    content:string;
}

export interface ResponseBody {
    message:ChatMessage;
    done:boolean;
}
