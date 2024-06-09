import React, {Component} from "react";
import PlayingBoard from "./PlayingBoard"
import "./App.css";

class App extends Component {
    render() {
        return (
            <div>
                <div style={boardStyle  } >
                    <PlayingBoard />
                </div>
            </div>
        )
    }
}

export default App;

const boardStyle = {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100vw",
    marginTop: 30,
    marginBottom: 50
}

