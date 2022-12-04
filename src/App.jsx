import "./App.css";
import logo from "./logo.svg";
import { useState, useReducer, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

async function getCompletion(prompt) {
  const BEARER_TOKEN = import.meta.env.VITE_BEARER_TOKEN;
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

function generatePrompt(messages) {
  let prompt = `This is a conversation between between a human and a AI chatbot. The AI chatbot is designed to assist with a wide range of tasks, including answering questions, providing explanations, and generating text. Everything is formatted using Markdown.\n\n`;

  // TODO: implement sliding window of 25 messages
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const { party, text } = message;
    if (party == "human") {
      prompt += `Human: ${text.trim()}\n\n`;
    } else if (party == "bot") {
      prompt += `Bot: ${text.trim()}\n\n`;
    }
  }
  // prompt for the bot
  prompt += "Bot: ";
  console.log(prompt);
  return prompt;
}

function parseCompletionIntoMessageText(completion) {
  const trimmedCompletion = completion.trim();
  // make sure we stop parsing when we encounter "Human: " on a new line:
  const indexOfHuman = trimmedCompletion.indexOf("\nHuman: ");
  if (indexOfHuman > -1) {
    return trimmedCompletion.substring(0, indexOfHuman);
  }
  return trimmedCompletion;
}

const initialState = { messages: [] };

function App() {
  const [prompt, setPrompt] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const inputElement = useRef(null);

  async function submit(e) {
    e.preventDefault();
    try {
      const humanMessage = {
        text: prompt,
        name: "You",
        party: "human",
        timestamp: Date.now(),
      };
      dispatch({
        type: "add_message",
        payload: humanMessage,
      });
      setPrompt("");
      setLoading(true);
      // scroll to the very bottom of the page
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 0);
      const completion = await getCompletion(
        generatePrompt([...state.messages, humanMessage])
      );
      const botMessage = {
        text: parseCompletionIntoMessageText(completion),
        name: "Bot",
        party: "bot",
        timestamp: Date.now(),
      };
      setLoading(false);
      dispatch({
        type: "add_message",
        payload: botMessage,
      });
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
        if (inputElement.current) {
          inputElement.current.focus();
        }
      }, 0);
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
            <div
              className={`chat-message-wrapper ${
                "chat-message-wrapper--" + message.party
              }`}
              key={message.timestamp}
            >
              <div className="chat-message">
                <div className="chat-message__avatar">
                  <img
                    src={`/${message.party}.png`}
                    alt="avatar"
                    width={30}
                    height={30}
                  />
                </div>
                <div className="chat-message__content">
                  <ReactMarkdown
                    children={message.text}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        // const match = /language-(\w+)/.exec(className || "");
                        // TODO: dynamically determine the language of the code block
                        const match = true;
                        return !inline && match ? (
                          <SyntaxHighlighter
                            children={String(children).trim()}
                            style={{
                              ...dark,
                            }}
                            customStyle={{
                              maxWidth: "calc(600px - 30px - 1em)",
                              boxSizing: "border-box",
                            }}
                            language={"csharp"}
                            PreTag="div"
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* chat input layout bellow */}
      <div className="chat-input-container">
        <form className="chat-input" onSubmit={submit}>
          <div className="chat-input__avatar">
            <img src={`/human.png`} alt="avatar" width={30} height={30} />
          </div>
          <div className="chat-input__content">
            <div className="chat-input__content__input">
              <input
                type="text"
                placeholder={loading ? "Loading..." : "Type your message"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus={true}
                disabled={loading}
                ref={inputElement}
              />
            </div>
            <div className="chat-input__content__button">
              <button disabled={loading}>Send</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
