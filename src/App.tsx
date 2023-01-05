import { useState, useReducer, useRef, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  text: string;
  name: "You" | "Bot";
  party: "bot" | "human";
  id: number;
}
interface State {
  messages: Message[];
}
type Action =
  | {
      type: "add_message";
      payload: Message;
    }
  | {
      type: "set_message";
      payload: Message;
    }
  | {
      type: "reset_messages";
    };

function ChatMessage({ message }: { message: Message }): JSX.Element {
  const messageText = message.text;
  // TODO: add blinking cursor
  return (
    <div
      className={`chat-message-wrapper ${
        "chat-message-wrapper--" + message.party
      }`}
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
          {/* TODO: add "Copy code" button */}
          <ReactMarkdown
            children={messageText}
            components={{
              code({ node, inline, className, children, ...props }) {
                // const match = /language-(\w+)/.exec(className || "");
                // TODO: dynamically determine the language of the code block
                const match = true;
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).trim()}
                    style={dark}
                    customStyle={{
                      maxWidth: "calc(600px - 30px - 1em)",
                      boxSizing: "border-box",
                    }}
                    language={"csharp"}
                    PreTag="div"
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
}

function reducer(state: State, action: Action) {
  switch (action.type) {
    case "add_message":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "set_message":
      const replacedMessages = state.messages.map((message) =>
        message.id === action.payload.id ? action.payload : message
      );
      const messages = state.messages.find(
        (message) => message.id === action.payload.id
      )
        ? replacedMessages
        : [...state.messages, action.payload];
      return {
        ...state,
        messages,
      };
    case "reset_messages":
      return {
        ...state,
        messages: [],
      };
    default:
      throw new Error();
  }
}

function parseCompletionIntoMessageText(completion: string) {
  const trimmedCompletion = completion.trim();
  // make sure we stop parsing when we encounter "Human: " on a new line:
  const indexOfHuman = trimmedCompletion.indexOf("\nHuman: ");
  if (indexOfHuman > -1) {
    return trimmedCompletion.substring(0, indexOfHuman);
  }
  return trimmedCompletion;
}

const initialState = { messages: [] };

declare global {
  function gtag(...args: any[]): void;
}

function App() {
  const [model, setModel] = useState("text-davinci-003");
  const [prompt, setPrompt] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const inputElement = useRef<HTMLInputElement | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      gtag("event", "send_message", {
        event_category: "messages",
        event_label: "Send human message",
        value: prompt.length,
      });
      const humanMessage = {
        text: prompt,
        name: "You" as const,
        party: "human" as const,
        id: Date.now(),
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
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/generate-chat-completion-streaming?force-json=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
          },
          body: JSON.stringify({
            messages: [...state.messages, humanMessage],
            model,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      let completion = "";
      let botMessage: Message | null = null;
      const id = Date.now();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // Convert the binary data to a string
        const dataString = new TextDecoder().decode(value);
        completion += dataString;

        botMessage = {
          text: parseCompletionIntoMessageText(completion),
          name: "Bot" as const,
          party: "bot" as const,
          id,
        };

        dispatch({
          type: "set_message",
          payload: botMessage,
        });
        setTimeout(() => {
          window.scrollTo(0, document.body.scrollHeight);
        }, 0);
      }

      setLoading(false);
      if (botMessage) {
        gtag("event", "receive_message", {
          event_category: "messages",
          event_label: "Receive bot message",
          value: botMessage.text.length,
        });
      }
      setTimeout(() => {
        if (inputElement.current) {
          inputElement.current.focus();
        }
      }, 0);
    } catch (e) {
      if ((e as Error).message === "Failed to fetch") {
        alert(
          "There is currently a problem with the DIY LLM Bot API. We are working to fix it as soon as possible. \n\nPlease try again later."
        );
      } else {
        alert(`${(e as Error).message}\n\nPlease try again later.`);
      }
    }
  }

  function resetChat() {
    dispatch({
      type: "reset_messages",
    });
    setPrompt("");
    setLoading(false);
    setModel("text-davinci-003");
    gtag("event", "reset_chat", {
      event_category: "messages",
      event_label: "Reset chat",
    });
  }

  return (
    <div className="App" role="main">
      <div className="header-container">
        <div className="header">
          <div className="header-item">
            {state.messages.length > 0 ? (
              <span className="header-item-link" onClick={resetChat}>
                Chat
              </span>
            ) : null}
            {state.messages.length === 0 ? "Chat" : null}
          </div>
          <div className="header-separator">|</div>
          <div className="header-item">
            <a href="https://github.com/noway/diy-llm-bot" rel="noopener">
              GitHub
            </a>
          </div>
          <div className="header-separator">|</div>
          <div className="header-item">
            <a href={import.meta.env.VITE_UPTIME_URL} rel="noopener">
              Status
            </a>
          </div>
        </div>
      </div>
      {state.messages.length > 0 ? (
        <div className="chat-history">
          {state.messages.map((message: Message) => {
            return <ChatMessage key={message.id} message={message} />;
          })}
        </div>
      ) : null}
      {/* lead copy */}
      {state.messages.length === 0 ? (
        <div className="lead-copy-container">
          <div className="lead-copy">
            <h1 style={{ marginBlockStart: 0 }}>Compare GPT-3 and ChatGPT</h1>
            <p>
              Step 1: Open{" "}
              <a href="https://chat.openai.com" rel="noopener">
                ChatGPT
              </a>{" "}
              and DIY LLM Bot side-by-side
            </p>
            <p>Step 2: Ask questions!</p>
            <h2>FAQ</h2>
            <p>
              <b>What's the prompt?</b>
            </p>
            <p>
              You can see the prompt{" "}
              <a
                href="https://github.com/noway/diy-llm-bot-api/blob/main/index.ts#L76"
                rel="noopener"
              >
                here
              </a>
              .
            </p>
            <p>
              <b>Is there source code?</b>
            </p>
            <p>
              You can find the source code here{" "}
              <a href="https://github.com/noway/diy-llm-bot" rel="noopener">
                here
              </a>
              .
            </p>
            <p>
              <b>Found it useful?</b>
            </p>
            <p>
              Leave a ⭐️ on{" "}
              <a href="https://github.com/noway/diy-llm-bot" rel="noopener">
                GitHub
              </a>
              .
            </p>
            <p>
              <b>What model is used?</b>
            </p>
            <p>
              You can select your model:{" "}
              <select
                name="model"
                id="model"
                onChange={(e) => setModel(e.target.value)}
                value={model}
              >
                <option value="text-davinci-002">text-davinci-002</option>
                <option value="text-davinci-003">text-davinci-003</option>
              </select>
            </p>
          </div>
        </div>
      ) : null}
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
