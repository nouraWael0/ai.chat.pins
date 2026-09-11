chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pin-this-location',
    title: '📌 Pin this location',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'pin-this-location' || !tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SELECTION' }, async (response) => {
    if (!response || !response.selection) return;

    const pin = {
      id: crypto.randomUUID(),
      name: info.selectionText.trim().slice(0, 40) || 'Untitled pin',
      site: response.site,
      conversationId: response.conversationId,
      exactText: response.selection.exactText,
      prefix: response.selection.prefix,
      suffix: response.selection.suffix,
      messageIndex: response.selection.messageIndex,
      createdAt: Date.now()
    };

    const { pins = [] } = await chrome.storage.local.get('pins');
    pins.push(pin);
    await chrome.storage.local.set({ pins });
  });
});