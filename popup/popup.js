async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadPins() {
  const tab = await getCurrentTab();
  const listEl = document.getElementById('pins-list');
  const emptyEl = document.getElementById('empty-state');

  chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SELECTION' }, async (response) => {
    const conversationId = response ? response.conversationId : null;
    const { pins = [] } = await chrome.storage.local.get('pins');
    const relevant = conversationId ? pins.filter(p => p.conversationId === conversationId) : pins;

    listEl.innerHTML = '';
    emptyEl.style.display = relevant.length ? 'none' : 'block';

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
    if (!result || !result.found) {
      li.classList.add('not-found');
      li.textContent = pin.name + ' — not found';
    } else {
      window.close();
    }
  });
}

loadPins();