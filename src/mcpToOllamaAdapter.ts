import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {ChatTools} from './interfaces/IChatInterface.js'


export function convertToOllama(tools:Tool[]):ChatTools[]{

        const toolsArray = tools.map((tool) => ({
            type:"function",
            function:{
                name:tool.name,
                description:tool.description,
                parameters:tool.inputSchema
            }
        }))
        return toolsArray;
   
}