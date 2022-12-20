import { useState, useReducer, useRef, FormEvent, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  text: string;
  party: "bot" | "human";
  timestamp: number;
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
      type: "reset_messages";
    };

function joinRepeatingTokens(str: string[]) {
  const result: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const curr = str[i];
    if (result.length > 0 && result[result.length - 1].endsWith(curr)) {
      result[result.length - 1] += curr;
    } else {
      result.push(curr);
    }
  }
  return result;
}
function tokenizeArrayByCharacter(tokens: string[], char: string) {
  return joinRepeatingTokens(
    tokens.flatMap((token) => {
      const result = [];
      const tokenized = token.split(char);
      for (let i = 0; i < tokenized.length - 1; i++) {
        result.push(tokenized[i] + char);
      }
      result.push(tokenized[tokenized.length - 1]);
      return result;
    })
  );
}

function tokenize(str: string) {
  let tokens = tokenizeArrayByCharacter([str], " ");
  tokens = tokenizeArrayByCharacter(tokens, ",");
  tokens = tokenizeArrayByCharacter(tokens, "(");
  tokens = tokenizeArrayByCharacter(tokens, ")");
  tokens = tokenizeArrayByCharacter(tokens, "{");
  tokens = tokenizeArrayByCharacter(tokens, "}");
  tokens = tokenizeArrayByCharacter(tokens, "<");
  tokens = tokenizeArrayByCharacter(tokens, ">");
  tokens = tokenizeArrayByCharacter(tokens, ";");
  tokens = tokenizeArrayByCharacter(tokens, "'");
  tokens = tokenizeArrayByCharacter(tokens, '"');
  tokens = tokenizeArrayByCharacter(tokens, "-");
  tokens = tokenizeArrayByCharacter(tokens, ".");
  tokens = tokenizeArrayByCharacter(tokens, "!");
  tokens = tokenizeArrayByCharacter(tokens, "`");
  tokens = tokenizeArrayByCharacter(tokens, "/");
  tokens = tokenizeArrayByCharacter(tokens, "\\");
  return tokens;
}

function ChatMessage({
  message,
  isAnimated,
}: {
  message: Message;
  isAnimated: boolean;
}): JSX.Element {
  const [messageText, setMessageText] = useState(
    isAnimated ? "" : message.text
  );
  const allTokens = tokenize(message.text);
  useEffect(() => {
    if (isAnimated) {
      const timer = setTimeout(() => {
        const tokensRead = tokenize(messageText).length;
        if (tokensRead < allTokens.length) {
          setMessageText(allTokens.slice(0, tokensRead + 1).join(""));
        } else {
          setMessageText(allTokens.join(""));
          clearTimeout(timer);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messageText, isAnimated, allTokens]);
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
        name: "You",
        party: "human" as const,
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/generate-chat-completion?force-json=true`,
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
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error.message);
      }
      const completion = data.completion;
      const botMessage = {
        text: parseCompletionIntoMessageText(completion),
        name: "Bot",
        party: "bot" as const,
        timestamp: Date.now(),
      };
      setLoading(false);
      dispatch({
        type: "add_message",
        payload: botMessage,
      });
      gtag("event", "receive_message", {
        event_category: "messages",
        event_label: "Receive bot message",
        value: botMessage.text.length,
      });
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
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
        alert((e as Error).message);
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
            <a href={import.meta.env.VITE_UPTIME_URL}>Status</a>
          </div>
        </div>
      </div>
      {state.messages.length > 0 ? (
        <div className="chat-history">
          {state.messages.map((message: Message, i) => {
            return (
              <ChatMessage
                key={message.timestamp}
                message={message}
                isAnimated={
                  i === state.messages.length - 1 && message.party === "bot"
                }
              />
            );
          })}
        </div>
      ) : null}
      {/* lead copy */}
      {state.messages.length === 0 ? (
        <div className="lead-copy-container">
          <div className="lead-copy">
            <h1 style={{ marginBlockStart: 0 }}>Compare GPT-3 and ChatGPT</h1>
            <p>
              Step 1: Open <a href="https://chat.openai.com">ChatGPT</a> and DIY
              LLM Bot side-by-side
            </p>
            <p>Step 2: Ask questions!</p>
            <h2>FAQ</h2>
            <p>
              <b>What's the prompt?</b>
            </p>
            <p>
              You can see the prompt{" "}
              <a href="https://github.com/noway/diy-llm-bot-api/blob/main/index.ts#L50">
                here
              </a>
              .
            </p>
            <p>
              <b>Is there source code?</b>
            </p>
            <p>
              You can find the source code here{" "}
              <a href="https://github.com/noway/diy-llm-bot">here</a>.
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
                {/* <option value="davinci-instruct-beta">
                  davinci-instruct-beta
                </option>
                <option value="davinci-instruct-beta:2.0.0">
                  davinci-instruct-beta:2.0.0
                </option> */}
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
