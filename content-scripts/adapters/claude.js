(function () {
  window.PinAdapter = {
    site: 'claude',
    getConversationId() {
      const m = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
      return m ? m[1] : 'unknown-claude-conversation';
    },
    getAssistantMessageContainers() {
      return Array.from(document.querySelectorAll('[data-testid="conversation-turn"]'))
        .filter(el => !el.querySelector('[data-testid="user-message"]'));
    },
    findMessageContainer(node) {
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return el ? el.closest('[data-testid="conversation-turn"]') : null;
    }
  };
})();