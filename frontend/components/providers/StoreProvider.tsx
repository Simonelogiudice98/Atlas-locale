"use client";

import { type AppStore, makeStore } from "@/store/store";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

const StoreProvider = ({children}:{children:ReactNode}) => {

    const [store] = useState<AppStore>(makeStore)

    return (
        <Provider store={store}>
            {children}
        </Provider>
    );

}

export default StoreProvider;