import { useState, useReducer, useEffect, useLayoutEffect, useRef, memo, type FormEvent, useCallback, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism, createElement } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import { isMobile } from "react-device-detect";
import copy from "copy-to-clipboard";

interface Message {
  text: string | null;
  name: "You" | "Bot" | null;
  party: "bot" | "human" | "error";
  id: string;
}
interface State {
  messages: Message[];
}
interface AddMessageAction {
  type: "add_message";
  payload: Message;
}
interface SetMessageAction {
  type: "set_message";
  payload: Message;
}
interface ResetMessagesAction {
  type: "reset_messages";
}
type Action = AddMessageAction | SetMessageAction | ResetMessagesAction;

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MODEL_AUTH_KEY = "gpt-4";

function rehypeInlineCodeProperty() {
  return (tree: Element) => {
    visit(tree, { tagName: 'code' as const }, function (node: Element, _index, parent: Element) {
      if (parent && parent.tagName === 'pre') {
        node.properties.inline = false;
      } else {
        node.properties.inline = true;
      }
    })
  }
}

const bot_url =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAAC80lEQVRIS7WVWUhUYRTHf9832RgWEmqltoxtFIGBU0IraVYW7ZE1LUYLBj0U0UOUpVGa9VDRSwRtD0VakNiGpI5R2kuZUCSIzkxoy4O2g5bOcuK2QDB3bGy5L/fhnvM75/uf8/2v4j8+qjfs1Va3lHSNCjsn7ECjCUeEW4q9/wmeZXXJ1a7RYTcUdmDf+Vfkp4Td5avCyvtt0EaLR6Kt3TQFNAZdUGgFg72aC76eJeoRvlF7xMA1x3wm6pP1W+MKBVqI79Jo4FwgdIEe4SsiXfIsv4HFBRNYWvWWnGxwXOjiY+YQruc2MvzoWKo+jAvJCPkhr79LnviE2jIX7xtOUDu9gCNpMdy7+JSOxtPE24uYuDyKSUpzoGOMKSckvEi7xdDYpYTBUwcwoLaDqKE+Hr224NUW4q1e4josxgTYK7bewQ19C5VHavt1U/GgGkv0SMrOp1GtKji+7DmHJi36Nt7cwMjey2LAL89slsoHFspLHtNua0NEgwqQ0JjAtuyJJGX4cFSO/TO4UWCDxS0xkUJcp6JPosL/CoZNE2NtWFvzF6v4q+/800uU069FZqX6KJ1tw36gBb8EUAqUMWWtqTs4gsn7W9FKs9s/IvyBHlYeEWXcRSNH0CicZxNJ39xK9bkk0re0YpviJzLWz5nMMczY1soeSQoqYFrRgD/JSyD54CsuFjbQNPtlkDMPej6c7Y7x1DtspBS/MF1HU/ieqW1yLPouWyrt3L7kpv3pySB4bPIOtq4ZTWniO3baBrKuJtgtTeEb+jRL8Zx6cpypnKopJ/L6rSB4QsxW1h9OpjD1IfvqJpPXHrzvpvCsiGYpy6hnQbWdG/crTOFflixkV/o8Ts6sI/dOCvmBYAswhW+yuOXS3DqWOFO4VlMZEr57RxbHBjpZUZVCsTdMeJHySH7mI+bftXPzXoXpbzaiM4KVGWlcnfuY5U47Jd1hal6gPFKS1Mbqlji0GOZk2Pr3QxovRYDAj0UtHfKGzA+xFHQGr+JXPcUQJyprHcEAAAAASUVORK5CYII=";
const human_url =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAACb0lEQVRIS92UX0hTURzHv2dWSx/KJojZS4GxhB5iQlQvPkQhlQg12ENlsWhMpOaW0sOcMF1ZJK6JYW70R6Fy5ei/EBFoRUoghtBCEnqqjIhWlLjpvb84Z7YGu3dsoi8dLhzu+d37+X1/3/M7h2EJB1tCNv5XOGPEbRsoBQyFqQYWDVLaytWDjNHuDQxEwNOdhIFXqQkuScvQ8mJWlaEcYIx2rWfQzEcJTGzOkw+ykJ9cSae8HJ7nMUWOKjyTLpoqj3+lZk9aWyJBC3LLNivm+T0yCt2hHlHFnrCy92nh0ckOWKrqhCnd972oNTYgFptD4IFXJDxSWYe+dzJAWcBnQlaytPgRCPmgLTkJnuTvSH6vMdrR1e8FxsahNQZShCoqn75lpkbfNbTe6BDwcxWrYO/0CH4y3G0+BbftGKTZKFaarmYGj961Uv3ZbrT1/VOstsFsPAySJGiN/szgHGQ1MPLdiSuPvr8IMA0YEVZstCVskoZHud/IO9yTRSsCaCrXkvOMA1hbLDaO9zqIofdRO/BlCowYzjvb4BqcyfIQzXvg2M6o9YITmhwt5ML8hDM5X7+hod4N78uFHn8Av+6ZqffmY8zFJID4w8CETsLx6irk7r+ywLsFgH5bo7i4RqonhGrRzjKgi9yOV+FKf2WrZubgYNcBhMNvUXsigO/2IUyXmJA3GcSbfWOCvcVgUD1APK4I31p5lBwHK7BJrxcQU01IzBN7PQiVhpC/ZjUKdAVizdLkw+uH1zPvFg73N9vEj3z+8TMCy+lnaHftAEFG8+V+sb4ocA75+PmTqHNdUXEi6aLBeRUBjw0kx63IRPkfkSH+GJhPFeIAAAAASUVORK5CYII=";

function ChatMessage({ message, blink }: { message: Message, blink: boolean }): React.JSX.Element {
  const { party } = message;
  const text = message.text ?? "";
  const lineCount = (text.match(/\n/g) || []).length + 1;
  const lastNewlineIndex = text.lastIndexOf("\n");
  const lastLineColumnCount =
    lastNewlineIndex === -1 ? text.length + 1 : text.length - lastNewlineIndex;
  const lastScrollHeight = useRef(document.body.scrollHeight);

  function scrollToBottom(stickyThreshold: number) {
    const currentScrollHeight = Math.ceil(window.innerHeight + window.scrollY);
    const documentHeight = document.body.scrollHeight;
    if (currentScrollHeight >= documentHeight - stickyThreshold) {
      if (currentScrollHeight < documentHeight) {
        window.scrollTo(0, documentHeight);
      }
    }
  }

  useLayoutEffect(() => {
    const newContentHeight = document.body.scrollHeight - lastScrollHeight.current;
    scrollToBottom(newContentHeight);
    lastScrollHeight.current = document.body.scrollHeight;
  }, [text]);

  return (
    <div
      className={`chat-message-wrapper chat-message-wrapper--${party}`}
    >
      <div className="chat-message">
        <div className="chat-message__avatar">
          {party === 'bot' || party === 'human' ? <img
            src={party === "bot" ? bot_url : human_url}
            alt="avatar"
          /> : null}
        </div>
        {party === 'bot' || party === 'human' ? <div className="chat-message__content">
          {text ? <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeInlineCodeProperty]}
            children={text}
            components={{
              code({ node, className, children, ...props }) {
                const inline = node?.properties.inline
                const nodeLineCount = node?.position?.start.line ?? 0
                const code = String(children ?? '').trim()
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : undefined
                return !inline ? (
                  <CodeBlock nodeLineCount={nodeLineCount} lineCount={lineCount} blink={blink} code={code} language={language} />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <p {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </p>
                );
              },
              h1({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h1 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h1>
                );
              },
              h2({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h2 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h2>
                );
              },
              h3({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h3 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h3>
                );
              },
              h4({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h4 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h4>
                );
              },
              h5({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h5 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h5>
                );
              },
              h6({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <h6 {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </h6>
                );
              },
              li({ node, children, ...props }) {
                const isLastLine = node?.position?.start.line === lineCount;
                return (
                  <li {...props}>
                    {children}
                    {isLastLine && blink ? <span className="blinking-cursor" /> : null}
                  </li>
                );
              },
              td({ node, children }) {
                const isLastLine = node?.position?.start.line === lineCount;
                const isLastColumn = node?.position?.end.column === lastLineColumnCount;
                return (
                  <td>
                    {children}
                    {isLastLine && isLastColumn && blink ? <span className="blinking-cursor" /> : null}
                  </td>
                );
              },
            }}
          /> : <p><i>Thinking...</i></p>}
        </div> : null}
        {party === 'error' ? <div className="chat-message__content chat-message__content--error">
          <p>{text}</p>
        </div> : null}
      </div>
    </div>
  );
}

const ChatMessageMemo = memo(ChatMessage);

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  return (
    <button 
      className="code-block__copy-button" 
      onClick={() => {
        copy(code);
        setCopied(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      }}
    >
      {copied ? "Copied!" : "Copy code"}
    </button>
  );
}

function CodeBlock(props: { lineCount: number, nodeLineCount: number, blink: boolean, code: string, language?: string }) {
  const EM_IN_PX = 16;
  const { nodeLineCount, lineCount, blink, code, language } = props;
  const viewportWidth = useViewportWidth();
  return (
    <div className="code-block__container">
      <div className="code-block__header">
        <span className="code-block__language">{language}</span>
        <CopyButton code={code} />
      </div>
      <Prism
        children={code}
        style={coldarkDark}
        customStyle={{
          maxWidth: `calc(${Math.min(
            viewportWidth,
            600 + 2 * EM_IN_PX
          )}px - 34.5px - 1em - 2em)`,
          boxSizing: "border-box",
        }}
        language={language}
        PreTag="div"
        className="code-block__code"
        renderer={(props) => {
          const { rows, stylesheet, useInlineStyles } = props;
          const codeLineCount = nodeLineCount + rows.length;
          const isLastParagraph = codeLineCount === lineCount;
          const elements = rows.map((row, index) => createElement({
            node: row,
            stylesheet,
            style: undefined,
            useInlineStyles,
            key: index,
          }));
          if (isLastParagraph && blink) {
            elements.push(<span className="blinking-cursor--container"><span className="blinking-cursor blinking-cursor--code" key="blinking-cursor" /></span>);
          }
          return elements;
        }}
      />
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
      return {
        ...state,
        messages: state.messages.find((message) => message.id === action.payload.id) ?
          state.messages.map((message) => message.id === action.payload.id ? action.payload : message) :
          [...state.messages, action.payload],
      };
    case "reset_messages":
      return {
        ...state,
        messages: [],
      };
    default:
      throw new Error(`Unknown action type: ${JSON.stringify(action)}`);
  }
}

const initialState = { messages: [] };

function parseCompletionIntoMessageText(completion: string) {
  const trimmedCompletion = completion.trim();
  // make sure we stop parsing when we encounter "Human: " on a new line:
  const indexOfHuman = trimmedCompletion.indexOf("\nHuman: ");
  if (indexOfHuman > -1) {
    return trimmedCompletion.substring(0, indexOfHuman);
  }
  return trimmedCompletion;
}


const useViewportWidth = () =>
  useSyncExternalStore(
    useCallback((cb: () => void) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    }, []),
    () => window.innerWidth
  );

async function setAuthKeyCookie(authKey: string) {
  const res = await fetch('/.netlify/functions/set_auth_key', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authKey }),
  })
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

async function getIsAuthed(): Promise<{ success: boolean, isAuthed: boolean }> {
  const apiDomain = import.meta.env.VITE_API_URL;
  const res = await fetch(`${apiDomain}/is-authed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

function App() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const textareaElement = useRef<HTMLTextAreaElement | null>(null);
  const isMaxWidth767 = useViewportWidth() <= 767;
  const controller = useRef<AbortController | undefined>(undefined);

  function promptAuthKey() {
    const key = window.prompt("Enter your auth key");
    if (key !== null && key !== undefined && `${key}`.trim() !== "") {
      setAuthKeyCookie(key);
      setIsAuthed(true);
    }
  }

  useEffect(() => {
    getIsAuthed().then((data) => {
      setIsAuthed(data.isAuthed);
      if (data.isAuthed) {
        setModel(DEFAULT_MODEL_AUTH_KEY);
      }
    });
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading) {
        stopGeneration();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [loading]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') return;
      if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
      if (textareaElement.current && !loading) {
        textareaElement.current.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [loading]);

  useLayoutEffect(() => {
    const el = textareaElement.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = (el.scrollHeight + 1.5) + 'px';
    }
  }, [prompt, isMaxWidth767]);

  function stopGeneration() {
    if (controller.current) {
      controller.current.abort();
      controller.current = undefined;
      setLoading(false);
    }
  }

  async function submit(e?: FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    if (prompt.trim() === "") {
      return;
    }
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
        id: `human-${Date.now()}`,
      };
      dispatch({
        type: "add_message",
        payload: humanMessage,
      });
      setPrompt("");
      setLoading(true);
      controller.current = new AbortController();
      const apiDomain = import.meta.env.VITE_API_URL;
      const id = `bot-${Date.now()}`;
      if (model === "o1-mini" || model === "o1-preview" || model === "gpt-5") {
        dispatch({
          type: "set_message",
          payload: {
            id,
            text: null,
            name: "Bot",
            party: "bot",
          },
        });
      }
      const res = await fetch(
        `${apiDomain}/generate-chat-completion-streaming`,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
          },
          body: JSON.stringify({
            messages: [...state.messages, humanMessage],
            model,
          }),
          signal: controller.current.signal,
          credentials: 'include',
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
      let { done, value } = await reader.read();
      while (!done) {
        // Convert the binary data to a string
        const dataString = new TextDecoder().decode(value);
        completion += dataString;

        let isError = false;
        try {
          // TODO: API should properly send 4xx/5xx status codes for this
          const headers: { [key: string]: string } = {};
          res.headers.forEach((value, name) => {
            headers[name] = value;
          })
          const msg = JSON.parse(completion);
          if (headers['content-length'] !== undefined && !msg.success && msg.error && msg.error.message) {
            isError = true;
          }
        }
        catch (e) {
          console.log('isError error', e);
          isError = false;
        }

        if (isError) {
          botMessage = {
            text: JSON.parse(completion).error.message,
            name: null,
            party: "error",
            id,
          };
        }
        else {
          botMessage = {
            text: parseCompletionIntoMessageText(completion),
            name: "Bot" as const,
            party: "bot" as const,
            id,
          };
        }

        dispatch({
          type: "set_message",
          payload: botMessage,
        });
        ({ done, value } = await reader.read());
      }
      controller.current = undefined;
      if (botMessage) {
        gtag("event", "receive_message", {
          event_category: "messages",
          event_label: "Receive bot message",
          value: botMessage.text?.length,
        });
      }
      setTimeout(() => {
        if (textareaElement.current) {
          textareaElement.current.focus();
        }
      }, 0);
    } catch (e) {
      if (e instanceof Error && e.message === "Failed to fetch") {
        const message = {
          text: "There is currently a problem with the DIY LLM Bot API. We are working to fix it as soon as possible. \n\nPlease try again later.",
          name: null,
          party: "error" as const,
          id: `error-${Date.now()}`,
        };
        dispatch({
          type: "set_message",
          payload: message,
        });
      } else if (e instanceof Error && e.message === "BodyStreamBuffer was aborted") {
        // ignore
      } else if (e instanceof Error && e.message === "Fetch is aborted") {
        // ignore
      } else {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        const message = {
          text: `${errorMessage}\n\nPlease try again later.`,
          name: null,
          party: "error" as const,
          id: `error-${Date.now()}`,
        };
        dispatch({
          type: "set_message",
          payload: message,
        });
      }
    }
    setLoading(false);
  }

  function resetChat() {
    if (controller.current) {
      controller.current.abort();
    }
    dispatch({
      type: "reset_messages",
    });
    setPrompt("");
    setLoading(false);
    setModel(isAuthed ? DEFAULT_MODEL_AUTH_KEY : DEFAULT_MODEL);
    gtag("event", "reset_chat", {
      event_category: "messages",
      event_label: "Reset chat",
    });
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      submit();
    }
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
              <span className="header-item-link" onClick={resetChat} role="button" aria-label="Reset chat">
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
        <>
          <div className="model-display-container">
            <div className="model-display">
              {model} · {state.messages.filter(m => m.party === 'human').length} messages
            </div>
          </div>
          <div className="chat-history" role="log" aria-live="polite" aria-relevant="additions">
            {state.messages.map((message, index) => {
              const { party } = message;
              const blink = party === "bot" && index === state.messages.length - 1 && loading
              return <ChatMessageMemo key={message.id} message={message} blink={blink} />;
            })}
          </div>
        </>
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
                href="https://github.com/noway/diy-llm-bot-api/blob/main/index.ts#L114"
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
              You can find the source code{" "}
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
                aria-label="Select model"
              >
                <option value="gpt-3.5-turbo-instruct">gpt-3.5-turbo-instruct</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4-1106-preview">gpt-4-1106-preview</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="anthropic/claude-3-opus:beta">anthropic/claude-3-opus:beta</option>
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                <option value="mistralai/Mixtral-8x7B-Instruct-v0.1">mistralai/Mixtral-8x7B-Instruct-v0.1</option>
                <option value="mistralai/mistral-large">mistralai/mistral-large</option>
                <option value="meta-llama/Llama-3-70b-chat-hf">meta-llama/Llama-3-70b-chat-hf</option>
                <option value="meta-llama/Meta-Llama-3.1-405B-Instruct">meta-llama/Meta-Llama-3.1-405B-Instruct</option>
                <option value="deepseek/deepseek-coder">deepseek/deepseek-coder</option>
                <option value="gpt-4" disabled={!isAuthed}>gpt-4</option>
                <option value="gpt-4.1" disabled={!isAuthed}>gpt-4.1</option>
                <option value="gpt-4.1-mini" disabled={!isAuthed}>gpt-4.1-mini</option>
                <option value="gpt-4.1-nano" disabled={!isAuthed}>gpt-4.1-nano</option>
                <option value="gpt-5" disabled={!isAuthed}>gpt-5</option>
                <option value="gpt-5-chat-latest" disabled={!isAuthed}>gpt-5-chat-latest</option>
                <option value="o1-preview" disabled={!isAuthed}>o1-preview</option>
                <option value="o1-mini" disabled={!isAuthed}>o1-mini</option>
              </select>
            </p>
          </div>
        </div>
      ) : null}
      <div className="chat-input-container">
        <form className="chat-input" onSubmit={submit}>
          <div className="chat-input__avatar" onClick={promptAuthKey} role="button" aria-label="Enter auth key">
            <img src={human_url} alt="avatar" />
          </div>
          <div className="chat-input__content">
            <div className="chat-input__content__textarea">
              <textarea
                placeholder={loading ? "Loading..." : "Type your message"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                disabled={loading}
                ref={textareaElement}
                rows={1}
                aria-label="Message input"
              ></textarea>
            </div>
            <div className="chat-input__content__button">
              {loading ? (
                <button onClick={stopGeneration} aria-label="Stop generation">Stop</button>
              ) : (
                <button disabled={loading} aria-label="Send message">Send</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
