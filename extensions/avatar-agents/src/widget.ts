/**
 * Web widget embed code generator.
 * Produces a small HTML/JS snippet that site owners can paste into their pages
 * to embed an avatar agent chat widget.
 */

export type WidgetOptions = {
  /** The agent ID to connect to. */
  agentId: string;
  /** Base URL of the avatar-agents API. */
  apiBaseUrl: string;
  /** Optional WebSocket URL for real-time avatar sync. */
  wsUrl?: string;
  /** Widget position on the page. */
  position?: "bottom-right" | "bottom-left";
  /** Primary brand color (hex). */
  primaryColor?: string;
  /** Widget title shown in the header. */
  title?: string;
};

const DEFAULT_PRIMARY_COLOR = "#1f6feb";
const DEFAULT_POSITION = "bottom-right";

/**
 * Generate the embed script tag that site owners paste into their HTML.
 * The script bootstraps a chat widget with an avatar viewer.
 */
export function generateWidgetEmbed(opts: WidgetOptions): string {
  const position = opts.position ?? DEFAULT_POSITION;
  const color = opts.primaryColor ?? DEFAULT_PRIMARY_COLOR;
  const title = opts.title ?? "Chat with us";
  const wsUrl = opts.wsUrl ?? opts.apiBaseUrl.replace(/^http/, "ws") + "/ws";

  // The embed is a self-contained script that creates an iframe pointing
  // to the widget host page. This keeps the widget sandboxed.
  return `<!-- Avatar Agent Widget -->
<script>
(function() {
  var d = document, s = d.createElement('script');
  s.async = true;
  s.src = '${opts.apiBaseUrl}/widget/loader.js';
  s.dataset.agentId = '${opts.agentId}';
  s.dataset.apiBase = '${opts.apiBaseUrl}';
  s.dataset.wsUrl = '${wsUrl}';
  s.dataset.position = '${position}';
  s.dataset.color = '${color}';
  s.dataset.title = '${title}';
  d.head.appendChild(s);
})();
</script>`;
}

/**
 * Generate the inline widget loader script that the embed tag loads.
 * This creates the floating chat button and iframe container.
 */
export function generateWidgetLoaderScript(opts: {
  widgetPageUrl: string;
}): string {
  return `(function() {
  var script = document.currentScript;
  var agentId = script.dataset.agentId;
  var apiBase = script.dataset.apiBase;
  var wsUrl = script.dataset.wsUrl;
  var position = script.dataset.position || 'bottom-right';
  var color = script.dataset.color || '${DEFAULT_PRIMARY_COLOR}';
  var title = script.dataset.title || 'Chat with us';

  // Create toggle button
  var btn = document.createElement('div');
  btn.id = 'avatar-agent-toggle';
  btn.style.cssText = 'position:fixed;' +
    (position === 'bottom-right' ? 'right:20px;' : 'left:20px;') +
    'bottom:20px;width:60px;height:60px;border-radius:50%;' +
    'background:' + color + ';cursor:pointer;z-index:99999;' +
    'display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 4px 12px rgba(0,0,0,0.15);';
  btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

  // Create iframe container
  var container = document.createElement('div');
  container.id = 'avatar-agent-container';
  container.style.cssText = 'position:fixed;' +
    (position === 'bottom-right' ? 'right:20px;' : 'left:20px;') +
    'bottom:90px;width:380px;height:520px;z-index:99998;' +
    'border-radius:12px;overflow:hidden;display:none;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.2);';

  var iframe = document.createElement('iframe');
  var params = '?agentId=' + agentId + '&apiBase=' + encodeURIComponent(apiBase) +
    '&wsUrl=' + encodeURIComponent(wsUrl) + '&color=' + encodeURIComponent(color) +
    '&title=' + encodeURIComponent(title);
  iframe.src = '${opts.widgetPageUrl}' + params;
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  container.appendChild(iframe);

  var open = false;
  btn.addEventListener('click', function() {
    open = !open;
    container.style.display = open ? 'block' : 'none';
  });

  document.body.appendChild(container);
  document.body.appendChild(btn);
})();`;
}
