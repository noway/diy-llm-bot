import "./App.css";
import logo from "./logo.svg";

function App() {
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
              condimentum, nisl ut ultricies tincidunt, nunc elit lacinia nunc, et
              ultricies nisl lorem eget nunc. Sed euismod, nisl sit amet
              consectetur lacinia, nunc elit lacinia nunc, et ultricies nisl lorem
              eget nunc.
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
            <input type="text" placeholder="Type your message" />
          </div>
          <div className="chat-input__content__button">
            <button>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
