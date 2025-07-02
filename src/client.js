const chat = document.getElementById('chat');
const typingIndicator = document.getElementById('typingIndicator');
const usernameInput = document.getElementById('usernameInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');

let username = '';
let ws;

const avatarColors = ['#2c8ef4', '#f44336', '#9c27b0', '#ff9800', '#009688', '#e91e63', '#3f51b5', '#ff5722', '#673ab7', '#00bcd4'];

function getAvatarColor(char) {
  const code = char.toUpperCase().charCodeAt(0);
  return avatarColors[code % avatarColors.length];
}

function addMessage(data, self = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (self) messageDiv.classList.add('self');

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('avatar');
  avatarDiv.textContent = data.username[0].toUpperCase();
  avatarDiv.style.backgroundColor = getAvatarColor(data.username[0]);

  const textDiv = document.createElement('div');
  textDiv.classList.add('text');
  textDiv.textContent = data.message;

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('time');
  const now = new Date();
  timeSpan.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  textDiv.appendChild(timeSpan);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(textDiv);
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

function showFilePreview(filename, filetype, base64Data, self = false, sender = '') {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (self) messageDiv.classList.add('self');

  const name = sender || username || 'U';
  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('avatar');
  avatarDiv.textContent = name[0].toUpperCase();
  avatarDiv.style.backgroundColor = getAvatarColor(name[0]);

  const textDiv = document.createElement('div');
  textDiv.classList.add('text');

  if (filetype.startsWith('image/')) {
    textDiv.innerHTML = `<img src="${base64Data}" style="max-width:200px; border-radius:8px;" />`;
  } else if (filetype.startsWith('audio/')) {
    textDiv.innerHTML = `<audio controls src="${base64Data}"></audio>`;
  } else {
    textDiv.innerHTML = `<a href="${base64Data}" download="${filename}">${filename}</a>`;
  }

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('time');
  const now = new Date();
  timeSpan.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  textDiv.appendChild(timeSpan);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(textDiv);
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

usernameInput.addEventListener('input', () => {
  username = usernameInput.value.trim();
  if (username.length > 0) {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      startWebSocket();
    }
  } else {
    messageInput.disabled = true;
    sendBtn.disabled = true;
    if (ws) ws.close();
  }
});

sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'file',
          username,
          filename: file.name,
          filetype: file.type,
          data: base64,
        }));
      }
    };
    reader.readAsDataURL(file);
  }

  if (message.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'message', username, message }));
  }

  messageInput.value = '';
  fileInput.value = '';
});

let typingTimeout;
messageInput.addEventListener('input', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'typing', username }));
  }
});

function showTyping(usernameTyping) {
  typingIndicator.textContent = `${usernameTyping} yozmoqda...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = '';
  }, 2000);
}

function startWebSocket() {
  ws = new WebSocket('ws://localhost:8080');
  ws.binaryType = 'blob';

  ws.onopen = () => {
    console.log('Ulandi!');
    ws.send(JSON.stringify({ type: 'register', username }));
  };

  ws.onmessage = async (event) => {
    let dataStr = event.data instanceof Blob ? await event.data.text() : event.data;

    try {
      const data = JSON.parse(dataStr);

      if (data.type === 'reject') {
        alert(data.reason);
        ws.close();
        return;
      }

      if (data.type === 'accept') {
        console.log("Ism qabul qilindi");
        return;
      }

      if (data.type === 'typing' && data.username !== username) {
        showTyping(data.username);
      }

      if (data.type === 'message' && data.username && data.message) {
        const isSelf = data.username === username;
        addMessage(data, isSelf);
      }

      if (data.type === 'file' && data.data && data.filetype) {
        const isSelf = data.username === username;
        showFilePreview(data.filename, data.filetype, data.data, isSelf, data.username);
      }

    } catch (err) {
      console.error('JSON xatolik:', err);
    }
  };

  ws.onclose = () => {
    console.log('Aloqa uzildi.');
  };
}

chat.addEventListener('dragover', (e) => {
  e.preventDefault();
  chat.style.border = '2px dashed #4caf50';
});

chat.addEventListener('dragleave', () => {
  chat.style.border = '1px solid #ccc';
});

chat.addEventListener('drop', (e) => {
  e.preventDefault();
  chat.style.border = '1px solid #ccc';
  const file = e.dataTransfer.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'file',
        username,
        filename: file.name,
        filetype: file.type,
        data: base64,
      }));
    }
  };
  reader.readAsDataURL(file);
});
