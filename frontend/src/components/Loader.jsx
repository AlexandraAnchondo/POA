import React from "react"
import "../styles/Loader.css"

const Loader = ({ loadingMessage = "" }) => {
    return (
        <div className="loading-spinner">
            <div className="loader"></div>
            <p className="loading-captions">{loadingMessage === "" ? "Cargando..." : loadingMessage}</p>
        </div>
    )
}

export default Loader