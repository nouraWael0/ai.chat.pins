async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadPins() {
  const tab = await getCurrentTab();
  const listEl = document.getElementById('pins-list');
  const emptyEl = document.getElementById('empty-state');

  chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SELECTION' }, (response) => {
    if (chrome.runtime.lastError) {
      emptyEl.textContent = 'Open a ChatGPT or Claude tab to see its pins.';
      emptyEl.style.display = 'block';
      return;
    }

    const conversationId = response ? response.conversationId : null;

    if (!conversationId) {
      emptyEl.textContent = 'Open a specific conversation to see its pins.';
      emptyEl.style.display = 'block';
      return;
    }

    renderPins(tab.id, conversationId, listEl, emptyEl);
  });
}

async function renderPins(tabId, conversationId, listEl, emptyEl) {
  const { pins = [] } = await chrome.storage.local.get('pins');
  const relevant = pins.filter(p => p.conversationId === conversationId);

  listEl.innerHTML = '';
  emptyEl.style.display = relevant.length ? 'none' : 'block';
  emptyEl.textContent = 'No pins yet — select text and right-click "Pin this location".';

  relevant.forEach(pin => {
    const li = document.createElement('li');
    if (pin.completed) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pin-check';
    checkbox.checked = !!pin.completed;
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleCompleted(pin.id);
      renderPins(tabId, conversationId, listEl, emptyEl);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pin-name';
    nameSpan.textContent = pin.name;
    nameSpan.addEventListener('click', () => resolvePin(tabId, pin, nameSpan));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.title = 'Delete pin';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePin(pin.id);
      renderPins(tabId, conversationId, listEl, emptyEl);
    });

    li.appendChild(checkbox);
    li.appendChild(nameSpan);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });
}

async function toggleCompleted(pinId) {
  const { pins = [] } = await chrome.storage.local.get('pins');
  const updated = pins.map(p => p.id === pinId ? { ...p, completed: !p.completed } : p);
  await chrome.storage.local.set({ pins: updated });
}

async function deletePin(pinId) {
  const { pins = [] } = await chrome.storage.local.get('pins');
  const updated = pins.filter(p => p.id !== pinId);
  await chrome.storage.local.set({ pins: updated });
}

function resolvePin(tabId, pin, el) {
  chrome.tabs.sendMessage(tabId, { type: 'RESOLVE_PIN', pin }, (result) => {
    if (chrome.runtime.lastError || !result || !result.found) {
      el.parentElement.classList.add('not-found');
      el.textContent = pin.name + ' — not found';
    } else {
      window.close();
    }
  });
}

loadPins();