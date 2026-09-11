async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadPins() {
  const tab = await getCurrentTab();
  const listEl = document.getElementById('pins-list');
  const emptyEl = document.getElementById('empty-state');

  chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SELECTION' }, async (response) => {
    if (chrome.runtime.lastError) {
      emptyEl.textContent = 'Open a ChatGPT or Claude tab to see its pins.';
      emptyEl.style.display = 'block';
      return;
    }

    const conversationId = response ? response.conversationId : null;
    const { pins = [] } = await chrome.storage.local.get('pins');

    listEl.innerHTML = '';

    if (!conversationId) {
      emptyEl.textContent = 'Open a specific conversation to see its pins.';
      emptyEl.style.display = 'block';
      return;
    }

    const relevant = pins.filter(p => p.conversationId === conversationId);
    emptyEl.style.display = relevant.length ? 'none' : 'block';
    emptyEl.textContent = 'No pins yet — select text and right-click "Pin this location".';

    relevant.forEach(pin => {
      const li = document.createElement('li');
      li.textContent = pin.name;
      li.addEventListener('click', () => resolvePin(tab.id, pin, li));
      listEl.appendChild(li);
    });
  });
}

function resolvePin(tabId, pin, li) {
  chrome.tabs.sendMessage(tabId, { type: 'RESOLVE_PIN', pin }, (result) => {
    if (chrome.runtime.lastError || !result || !result.found) {
      li.classList.add('not-found');
      li.textContent = pin.name + ' — not found';
    } else {
      window.close();
    }
  });
}

loadPins();