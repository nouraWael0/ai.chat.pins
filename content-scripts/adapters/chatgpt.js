(function () {
  window.PinAdapter = {
    site: 'chatgpt',
    getConversationId() {
      const m = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
      return m ? m[1] : 'unknown-chatgpt-conversation';
    },
    getAssistantMessageContainers() {
      return Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    },
    findMessageContainer(node) {
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return el ? el.closest('[data-message-author-role="assistant"]') : null;
    }
  };
})();