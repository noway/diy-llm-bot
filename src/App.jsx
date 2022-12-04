import "./App.css";
import logo from "./logo.svg";
import { useState } from "react";

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

function App() {
  const [prompt, setPrompt] = useState("");
  return (
    <div className="App" role="main">
      {/* chat history layout bellow */}
      <div className="chat-history">
        <div className="chat-message">
          <div className="chat-message__avatar">
            <img src={logo} alt="avatar" />
          </div>
          <div className="chat-message__content">
            <div className="chat-message__content__name">John Doe</div>
            <div className="chat-message__content__text">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              condimentum, nisl ut ultricies tincidunt, nunc elit lacinia nunc,
              et ultricies nisl lorem eget nunc. Sed euismod, nisl sit amet
              consectetur lacinia, nunc elit lacinia nunc, et ultricies nisl
              lorem eget nunc.
            </div>
          </div>
        </div>
      </div>
      {/* chat input layout bellow */}
      <div className="chat-input">
        <div className="chat-input__avatar">
          <img src={logo} alt="avatar" />
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
            <button
              onClick={async () => {
                const completion = await getCompletion(prompt);
                alert(completion);
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
