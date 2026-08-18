import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import type { Song } from "../shared/types";

function MainWindow() {

    useEffect(() => {
        //@ts-ignore
        window.electron.subscribe(data => console.log(data));
    }, [])

    return(
        <div>
            
        </div>
    )
}

export default MainWindow