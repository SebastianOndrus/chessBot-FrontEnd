import React, { Component } from "react";
import PropTypes from "prop-types";
import {Chess} from "chess.js";
import Chessboard from "chessboardjsx";
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Badge from 'react-bootstrap/Badge';
import 'bootstrap/dist/css/bootstrap.min.css';
import "./PlayingBoard.css";
import Form from 'react-bootstrap/Form';
import axios from "axios";



class Pvp extends Component {

    static propTypes = {
        children: PropTypes.func
    };

    state = {
        fen: "start",
        // square styles for active drop square
        dropSquareStyle: {},
        // custom square styles
        squareStyles: {},
        // square with the currently clicked piece
        pieceSquare: "",
        // currently clicked square
        square: "",
        // array of past game moves
        history: [],
        isNewGame: true,
        winner: null,
        currentPlayer: "white",
        moveHistory: [], //  an empty array for move history to display
        orientation: 'white', // used to flip board
        isCheck: false,
        isDraw: false,
        isGameOver: false,
        customFEN: "",
    };

    makeBotMove = async ()  => {
        this.removeHighlightSquare();
        // const possibleMoves = this.game.moves();

        const predictedMove = await this.predictMoveFromBackend(this.game.fen());
        // exit if the game is over
        if (this.state.isGameOver || this.state.isDraw || predictedMove.length === 0)
            return;

        // const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        let move;
        try {
            move = this.game.move({ from: predictedMove.from, to: predictedMove.to, promotion: predictedMove.promotion });
            // Update the move history array
            const newMoveHistory = [...this.state.moveHistory, move];


            this.setState({
                fen: this.game.fen(),
                history: this.game.history({ verbose: true }),
                currentPlayer: this.state.currentPlayer === "white" ? "black" : "white", // Switch the current player
                moveHistory: newMoveHistory, // Update the move history
                isGameOver: this.game.isGameOver(),
                isDraw: this.game.isDraw(),
                isCheck: this.game.inCheck(),
                isNewGame: false, // Set isNewGame to false after a move
            });
        } catch (e) {
            console.log(e)
        }

    }

    predictMoveFromBackend = async (boardState) => {
        try {
            const response = await axios.post("http://localhost:5000/predict_move", { board_state: boardState });
            const move = response.data.move;
            console.log("Predicted move from backend:", move);
            const moveFrom = move.substring(0, 2);
            const moveTo = move.substring(2, 4);
            const promotion = move.substring(4, 5);

            return {'from': moveFrom, 'to': moveTo, 'promotion': promotion}

            // Implement logic to update the chessboard with the predicted move
        } catch (error) {
            console.error("Error predicting move from backend:", error);
            return {'from': null, 'to': null, 'promotion': null};
        }
    };


    showBotMove = async () => {
        this.removeHighlightSquare();

        const currentBoardState = this.game.fen();
        const predictedMove = await this.predictMoveFromBackend(currentBoardState);

        if (this.state.isGameOver || this.state.isDraw || predictedMove === null)
            return;

        // const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        // const move = this.game.move(possibleMoves[randomIndex]);
        const moveFrom = predictedMove.from;
        const moveTo = predictedMove.to;
        const promotion = predictedMove.promotion;
        const move = this.game.move({ from: moveFrom, to: moveTo, promotion: promotion });

        this.highlightSquare(move.from, [move.to]);
        this.game.undo();
    }


    handleNewGameClick = () => {
        this.game.reset(); // Reset the chess game
        this.setState({
            fen: "start", // Reset the FEN to the initial state
            isNewGame: true, // Set isNewGame to true
            dropSquareStyle: {},
            // custom square styles
            squareStyles: {},
            // square with the currently clicked piece
            pieceSquare: "",
            // currently clicked square
            square: "",
            moveHistory: [],
            currentPlayer: 'white',
            winner: null,
            isCheck: false,
            isDraw: false,
            isGameOver: false

        });
    };

    handleUndoMoveClick = () => {
        const move = this.game.undo(); // Undo the last move


        if (move) {
            const moveHistory = [...this.state.moveHistory];
            moveHistory.pop();

            this.setState({
                fen: this.game.fen(),
                history: this.game.history({ verbose: true }),
                currentPlayer: this.state.currentPlayer === "white" ? "black" : "white",
                moveHistory: moveHistory, // Updated move history without the last move
            });
        }
    };

    handleCustomFEN = () => {
        try {
           this.game.load(this.state.customFEN);
            this.setState({
                fen: this.state.customFEN, // Update the FEN in the state
                customFEN: '', // Clear the custom FEN input field
                history: this.game.history({ verbose: true }), // Update the history
                moveHistory: [], // Clear the move history
                currentPlayer: this.game.turn() === 'w' ? 'white' : 'black', // Update the current player
            });
        } catch (e) {
            console.log(e)
        }
    };

    toggleBoardOrientation = () => {
        this.setState((prevState) => ({
            orientation: prevState.orientation === 'white' ? 'black' : 'white',
        }));
    };

    componentDidMount() {
        this.game = new Chess();
    }

    // keep clicked square style and remove hint squares
    removeHighlightSquare = () => {
        this.setState(({ pieceSquare, history }) => ({
            squareStyles: squareStyling({ pieceSquare, history })
        }));
    };

    // show possible moves
    highlightSquare = (sourceSquare, squaresToHighlight) => {
        const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
            (a, c) => {
                return {
                    ...a,
                    ...{
                        [c]: {
                            background:
                                "radial-gradient(circle, #fffc00 16%, transparent 70%)",
                            borderRadius: "60%"
                        }
                    },
                    ...squareStyling({
                        history: this.state.history,
                        pieceSquare: this.state.pieceSquare
                    })
                };
            },
            {}
        );

        this.setState(({ squareStyles }) => ({
            squareStyles: { ...squareStyles, ...highlightStyles }
        }));
    };




    onDrop = ({ sourceSquare, targetSquare }) => {
        try {
            // Attempt to make the move
            const move = this.game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q"
            });

            // If the move is invalid, an error will be thrown
            if (!move) {
                throw new Error("Invalid move");
            }

            // Update the move history array
            const newMoveHistory = [...this.state.moveHistory, move];

            // Toggle the current player's turn
            const newPlayer = this.state.currentPlayer === "white" ? "black" : "white";

            // Check if the current player is in check
            if (this.game.inCheck()) {
                this.setState({ isCheck: true });
            } else {
                this.setState({ isCheck: false });
            }
            // Check if the game is over
            if (this.game.isGameOver()) {
                this.setState({ isGameOver: true });
            } else {
                this.setState({ isGameOver: false });
            }
            // Check if the current player is in Draw
            if (this.game.isDraw()) {
                this.setState({ isDraw: true });
            } else {
                this.setState({ isDraw: false });
            }

            // Continue with valid move handling
            this.setState(({ history, pieceSquare }) => ({
                fen: this.game.fen(),
                history: this.game.history({ verbose: true }),
                squareStyles: squareStyling({ pieceSquare, history }),
                isNewGame: false, // Set isNewGame to false after a move
                currentPlayer: newPlayer, // Update the current player
                moveHistory: newMoveHistory, // Update the move history
            }));
        } catch (error) {
            // Handle the case of an invalid move here
            // For example, display an error message or prevent the move
            console.error("Invalid move:", error.message);
            return;
        }
    };

    onMouseOverSquare = square => {
        // get list of possible moves for this square
        let moves = this.game.moves({
            square: square,
            verbose: true
        });

        // exit if there are no moves available for this square
        if (moves.length === 0) return;

        let squaresToHighlight = [];
        for (var i = 0; i < moves.length; i++) {
            squaresToHighlight.push(moves[i].to);
        }

        this.highlightSquare(square, squaresToHighlight);
    };

    onMouseOutSquare = square => this.removeHighlightSquare(square);

    // central squares get diff dropSquareStyles
    onDragOverSquare = square => {
        this.setState({
            dropSquareStyle:
                square === "e4" || square === "d4" || square === "e5" || square === "d5"
                    ? { backgroundColor: "cornFlowerBlue" }
                    : { boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }
        });
    };


    render() {
        const { fen,customFEN, dropSquareStyle, squareStyles,
            isNewGame, currentPlayer, moveHistory,
             isDraw, isGameOver, isCheck } = this.state;

        const renderMovePairs = (moves) => {
            const movePairs = [];
            for (let i = 0; i < moves.length; i += 2) {
                const move1 = moves[i];
                const move2 = moves[i + 1];
                if (move2) {
                    movePairs.push(`${move1.san} ${move2.san}`);
                } else {
                    movePairs.push(move1.san);
                }
            }
            return movePairs;
        };

        return (
            <div className="board-container">
                <div className="board">
                    <div className="current-player">
                        <p>
                            Current Player:{" "}
                            <Badge bg={currentPlayer === "white" ? "info" : "dark"} text={currentPlayer === "black" ? "light" : "dark"}>
                                {currentPlayer}
                            </Badge>
                        </p>
                    </div>
                    {isCheck && !isGameOver && <p>{currentPlayer} is in Check!</p>}
                    {isDraw && <p>Draw!</p>}
                    {isGameOver && <p>GameOver {this.state.currentPlayer === "white" ? "black" : "white"} won!</p>}
                    {this.props.children({
                        squareStyles,
                        position: fen,
                        onMouseOverSquare: this.onMouseOverSquare,
                        onMouseOutSquare: this.onMouseOutSquare,
                        onDrop: this.onDrop,
                        dropSquareStyle,
                        onDragOverSquare: this.onDragOverSquare,
                        onSquareClick: this.onSquareClick,
                        orientation: this.state.orientation,
                    })}
                    <p style={{fontSize:16, marginTop:10}}> fen: {fen}</p>
                    <Form style={{ marginTop: 20 }}>
                        <Form.Group>
                            <Form.Control
                                type="text"
                                placeholder="Enter custom FEN"
                                value={customFEN}
                                onChange={(e) => this.setState({ customFEN: e.target.value })}
                            />
                        </Form.Group>
                        <Button variant="secondary" onClick={this.handleCustomFEN}>
                            Apply FEN
                        </Button>
                    </Form>
                </div>


                <div className="move-history" style={{backgroundColor: "#dcdcdc", marginTop:40, borderRadius : 25 }}>
                    <div className="game-buttons" style={{ marginBottom:20, marginTop:20}}>
                        <ButtonGroup style={{width:300}} size={"sm"}>
                            <Button variant="success" onClick={this.handleNewGameClick}>New Game</Button>
                            <Button variant="danger" onClick={this.handleUndoMoveClick}>Undo Move</Button>
                            <Button variant="secondary" onClick={this.toggleBoardOrientation}>Flip Board</Button>
                        </ButtonGroup>
                        <br />
                        <ButtonGroup style={{marginTop:20, width:300}} size={"sm"}>
                        <Button variant="light" style={{backgroundColor: "yellow", color: "black"}} onClick={this.showBotMove}>Show Move</Button>
                        <Button variant="dark" style={{backgroundColor: "indianred"}}  onClick={this.makeBotMove}>Make Move</Button>
                        </ButtonGroup>
                    </div >
                    <div >
                        <h3 style={{textAlign:"center"}}>Move History:</h3>
                        <ol start={moveHistory.length- Math.floor(moveHistory.length/2) } reversed>
                            {renderMovePairs(moveHistory).map((movePair, index) => (
                                <li key={index}>{movePair}</li>
                            )).reverse()}
                        </ol>
                    </div>

                </div>

            </div>
        );
    }



}

export default function PlayingBoard() {
    return (
        <div>
            <Pvp>
                {({
                      position,
                      onDrop,
                      onMouseOverSquare,
                      onMouseOutSquare,
                      squareStyles,
                      dropSquareStyle,
                      onDragOverSquare,
                      onSquareClick,
                      orientation
                  }) => (
                    <Chessboard
                        id="humanVsHuman"
                        width={560}
                        position={position}
                        onDrop={onDrop}
                        onMouseOverSquare={onMouseOverSquare}
                        onMouseOutSquare={onMouseOutSquare}
                        boardStyle={{
                            borderRadius: "5px",
                            boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
                        }}
                        squareStyles={squareStyles}
                        dropSquareStyle={dropSquareStyle}
                        onDragOverSquare={onDragOverSquare}
                        onSquareClick={onSquareClick}
                        orientation={orientation}
                    />
                )}
            </Pvp>
        </div>
    );
}


const squareStyling = ({ pieceSquare, history }) => {
    const sourceSquare = history.length && history[history.length - 1].from;
    const targetSquare = history.length && history[history.length - 1].to;

    return {
        [pieceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        ...(history.length && {
            [sourceSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        }),
        ...(history.length && {
            [targetSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        })
    };
};
