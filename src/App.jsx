import "./App.css";
import logo from "./logo.svg";
import { useState, useReducer } from "react";

async function getCompletion(prompt) {
  const BEARER_TOKEN = process.env.REACT_APP_BEARER_TOKEN;
  const model = "text-davinci-002";
  const temperature = 0.5;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER_TOKEN}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      temperature,
    }),
  };
  const response = await fetch(
    "https://api.openai.com/v1/completions",
    options
  );
  const body = await response.json();
  return body["choices"][0]["text"];
}

function reducer(state, action) {
  switch (action.type) {
    case "add_message":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    default:
      throw new Error();
  }
}
const initialState = { messages: [] };

function App() {
  const [prompt, setPrompt] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="App" role="main">
      {/* chat history layout bellow */}
      <div className="chat-history">
        {state.messages.map((message) => {
          return (
            <div className="chat-message">
              <div className="chat-message__avatar">
                <img src={logo} alt="avatar" width={50} height={50} />
              </div>
              <div className="chat-message__content">
                <div className="chat-message__content__name">
                  {message.name}
                </div>
                <div className="chat-message__content__text">
                  {message.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* chat input layout bellow */}
      <form
        className="chat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          dispatch({
            type: "add_message",
            payload: { text: prompt, name: "You" },
          });
          const completion = await getCompletion(prompt);
          setPrompt("");
          dispatch({
            type: "add_message",
            payload: { text: completion, name: "Bot" },
          });
        }}
      >
        <div className="chat-input__avatar">
          <img src={logo} alt="avatar" width={50} height={50} />
        </div>
        <div className="chat-input__content">
          <div className="chat-input__content__input">
            <input
              type="text"
              placeholder="Type your message"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="chat-input__content__button">
            <button>Send</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
