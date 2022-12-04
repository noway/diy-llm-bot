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
      max_tokens: 1024,
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

function generatePrompt(messages) {
  let prompt = `This is a conversation between between a human and a AI chatbot. The AI chatbot is designed to assist with a wide range of tasks, including answering questions, providing explanations, and generating text.\n\n`

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const {party, text} = message;
    if (party == "human") {
      prompt += `Human: ${text.trim()}\n\n`;
    } else if (party == "bot") {
      prompt += `Bot: ${text.trim()}\n\n`;
    }
  }
  // prompt for the bot
  prompt += "Bot: ";
  console.log('prompt',prompt);
  return prompt;
}

function parseCompletionIntoMessageText(completion) {
  return completion.trim();
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    try {
      const newMessage = { text: prompt, name: "You", party: "human" };
      dispatch({
        type: "add_message",
        payload: newMessage,
      });
      setPrompt("");
      setLoading(true);
      const completion = await getCompletion(
        generatePrompt([...state.messages, newMessage])
      );
      setLoading(false);
      dispatch({
        type: "add_message",
        payload: { text: parseCompletionIntoMessageText(completion), name: "Bot", party: "bot" },
      });
    } catch (e) {
      alert(e.message);
    }
  }

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
                <pre className="chat-message__content__text">
                  {message.text}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
      {/* chat input layout bellow */}
      <form className="chat-input" onSubmit={submit}>
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
            <button disabled={loading}>Send</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
