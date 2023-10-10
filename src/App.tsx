import { useState, useReducer, useRef, FormEvent, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyToClipboard } from "react-copy-to-clipboard";
const styleToUse = coldarkDark

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

const bot_url =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAAC80lEQVRIS7WVWUhUYRTHf9832RgWEmqltoxtFIGBU0IraVYW7ZE1LUYLBj0U0UOUpVGa9VDRSwRtD0VakNiGpI5R2kuZUCSIzkxoy4O2g5bOcuK2QDB3bGy5L/fhnvM75/uf8/2v4j8+qjfs1Va3lHSNCjsn7ECjCUeEW4q9/wmeZXXJ1a7RYTcUdmDf+Vfkp4Td5avCyvtt0EaLR6Kt3TQFNAZdUGgFg72aC76eJeoRvlF7xMA1x3wm6pP1W+MKBVqI79Jo4FwgdIEe4SsiXfIsv4HFBRNYWvWWnGxwXOjiY+YQruc2MvzoWKo+jAvJCPkhr79LnviE2jIX7xtOUDu9gCNpMdy7+JSOxtPE24uYuDyKSUpzoGOMKSckvEi7xdDYpYTBUwcwoLaDqKE+Hr224NUW4q1e4josxgTYK7bewQ19C5VHavt1U/GgGkv0SMrOp1GtKji+7DmHJi36Nt7cwMjey2LAL89slsoHFspLHtNua0NEgwqQ0JjAtuyJJGX4cFSO/TO4UWCDxS0xkUJcp6JPosL/CoZNE2NtWFvzF6v4q+/800uU069FZqX6KJ1tw36gBb8EUAqUMWWtqTs4gsn7W9FKs9s/IvyBHlYeEWXcRSNH0CicZxNJ39xK9bkk0re0YpviJzLWz5nMMczY1soeSQoqYFrRgD/JSyD54CsuFjbQNPtlkDMPej6c7Y7x1DtspBS/MF1HU/ieqW1yLPouWyrt3L7kpv3pySB4bPIOtq4ZTWniO3baBrKuJtgtTeEb+jRL8Zx6cpypnKopJ/L6rSB4QsxW1h9OpjD1IfvqJpPXHrzvpvCsiGYpy6hnQbWdG/crTOFflixkV/o8Ts6sI/dOCvmBYAswhW+yuOXS3DqWOFO4VlMZEr57RxbHBjpZUZVCsTdMeJHySH7mI+bftXPzXoXpbzaiM4KVGWlcnfuY5U47Jd1hal6gPFKS1Mbqlji0GOZk2Pr3QxovRYDAj0UtHfKGzA+xFHQGr+JXPcUQJyprHcEAAAAASUVORK5CYII=";
const human_url =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAACb0lEQVRIS92UX0hTURzHv2dWSx/KJojZS4GxhB5iQlQvPkQhlQg12ENlsWhMpOaW0sOcMF1ZJK6JYW70R6Fy5ei/EBFoRUoghtBCEnqqjIhWlLjpvb84Z7YGu3dsoi8dLhzu+d37+X1/3/M7h2EJB1tCNv5XOGPEbRsoBQyFqQYWDVLaytWDjNHuDQxEwNOdhIFXqQkuScvQ8mJWlaEcYIx2rWfQzEcJTGzOkw+ykJ9cSae8HJ7nMUWOKjyTLpoqj3+lZk9aWyJBC3LLNivm+T0yCt2hHlHFnrCy92nh0ckOWKrqhCnd972oNTYgFptD4IFXJDxSWYe+dzJAWcBnQlaytPgRCPmgLTkJnuTvSH6vMdrR1e8FxsahNQZShCoqn75lpkbfNbTe6BDwcxWrYO/0CH4y3G0+BbftGKTZKFaarmYGj961Uv3ZbrT1/VOstsFsPAySJGiN/szgHGQ1MPLdiSuPvr8IMA0YEVZstCVskoZHud/IO9yTRSsCaCrXkvOMA1hbLDaO9zqIofdRO/BlCowYzjvb4BqcyfIQzXvg2M6o9YITmhwt5ML8hDM5X7+hod4N78uFHn8Av+6ZqffmY8zFJID4w8CETsLx6irk7r+ywLsFgH5bo7i4RqonhGrRzjKgi9yOV+FKf2WrZubgYNcBhMNvUXsigO/2IUyXmJA3GcSbfWOCvcVgUD1APK4I31p5lBwHK7BJrxcQU01IzBN7PQiVhpC/ZjUKdAVizdLkw+uH1zPvFg73N9vEj3z+8TMCy+lnaHftAEFG8+V+sb4ocA75+PmTqHNdUXEi6aLBeRUBjw0kx63IRPkfkSH+GJhPFeIAAAAASUVORK5CYII=";

function ChatMessage({ message, blink }: { message: Message, blink: boolean }): JSX.Element {
  const messageText = message.text;
  // TODO: add blinking cursor
  const EM_IN_PX = 16;
  const [viewportWidth, setViewportWidth] = useState(window.screen.width);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.screen.width);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const paragraphCount = (messageText.match(/\n/g) || []).length + 1;

  return (
    <div
      className={`chat-message-wrapper ${
        "chat-message-wrapper--" + message.party
      }`}
    >
      <div className="chat-message">
        <div className="chat-message__avatar">
          <img
            src={message.party === "bot" ? bot_url : human_url}
            alt="avatar"
          />
        </div>
        <div className="chat-message__content">
          <ReactMarkdown
            children={messageText}
            components={{
              code({ node, inline, className, children, ...props }) {
                // const match = /language-(\w+)/.exec(className || "");
                // TODO: dynamically determine the language of the code block
                const language = "csharp";
                const match = true;
                return !inline && match ? (
                  <div className="chat-message__code-block">
                    <div className="code-block__header">
                      <span className="code-block__language">{language}</span>
                      <CopyToClipboard text={String(children).trim()} onCopy={handleCopy}>
                        <button className="code-block__copy-button">
                          {copied ? "Copied!" : "Copy code"}
                        </button>
                      </CopyToClipboard>
                    </div>
                    <SyntaxHighlighter
                      children={String(children).trim()}
                      style={styleToUse}
                      customStyle={{
                        maxWidth: `calc(${Math.min(
                          viewportWidth,
                          600 + 2 * EM_IN_PX
                        )}px - 34.5px - 1em - 2em)`,
                        boxSizing: "border-box",
                      }}
                      language={language}
                      PreTag="div"
                      className={"code-block__code"}
                    />
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p({ node, children, ...props }) {
                const isLastParagraph = node.position!.start.line === paragraphCount;
                return (
                  <p {...props}>
                    {children}
                    {isLastParagraph && blink ? <span className="blinking-cursor" /> : null}
                  </p>
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
  const [model, setModel] = useState("gpt-3.5-turbo");
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
    setModel("gpt-3.5-turbo");
    gtag("event", "reset_chat", {
      event_category: "messages",
      event_label: "Reset chat",
    });
  }

  return (
    <div className="App" role="main">
      {location.hostname === "diy-llm-bot.netlify.app" ? (
        <div className="notice-container">
          <div className="notice">
            DIY LLM Bot has moved to{" "}
            <a href="https://diy-llm-bot.com" rel="noopener">
              diy-llm-bot.com
            </a>
            . Please update your bookmarks.
          </div>
        </div>
      ) : null}
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
          {state.messages.map((message: Message, index: number) => {
            const { party } = message;
            const blink = party === "bot" && index === state.messages.length - 1 && loading
            return <ChatMessage key={message.id} message={message} blink={blink} />;
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
                href="https://github.com/noway/diy-llm-bot-api/blob/main/index.ts#L73"
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
              Leave a ⭐️ and 🍴 on{" "}
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
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </p>
          </div>
        </div>
      ) : null}
      <div className="chat-input-container">
        <form className="chat-input" onSubmit={submit}>
          <div className="chat-input__avatar">
            <img src={human_url} alt="avatar" />
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
