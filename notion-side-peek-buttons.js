// ==UserScript==
// @name         Notion Side Peek buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {
  const BLOCK_ID = "27a9f56f-f579-41f8-83ea-5147c7f99bb5";
  const PAGE_P_PARAM = "27a9f56ff57941f883ea5147c7f99bb5";
  const BTN_ID = "tm-notion-sidepeek-backlog-btn";

  // buttons are added to root element (.notion-frame) and manuallyy positionned relatively to target because it is not possible to add them directly to target (blocked by Notion)
  const STABLE_ROOT_SELECTOR = ".notion-frame";
  const TARGET_SELECTOR =
    ".notion-frame > .notion-selectable-container > .notion-scroller.vertical > div > .layout > .layout-content";

  let btn = null;
  let root = null;

  function isSidePeekOpen() {
    return location.search.includes(`p=${PAGE_P_PARAM}`);
  }

  function openSidePeek() {
    const a = document.querySelector(`[data-block-id="${BLOCK_ID}"] a`);
    a?.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true }));
  }

  function makeButton() {
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.innerHTML = `
      <span style="font-size:18px;">🗄️</span>
      <span style="font-size:16px;font-weight:600;margin-left:8px;">Backlog</span>
    `;

    Object.assign(btn.style, {
      position: "absolute",
      top: "12px",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "none",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
      boxShadow: "0 1px 3px rgba(0,0,0,.15)",
      transition: "background .15s, color .15s, transform .08s",
      zIndex: 9999
    });

    btn.onclick = openSidePeek;
    btn.onmouseenter = () => (btn.style.transform = "translateY(-1px)");
    btn.onmouseleave = () => (btn.style.transform = "translateY(0)");

    return btn;
  }

  function refreshStyle() {
    if (!btn) return;
    if (isSidePeekOpen()) {
      btn.style.background = "rgb(35,131,226)";
      btn.style.color = "#fff";
    } else {
      btn.style.background = "rgb(244,245,247)";
      btn.style.color = "#333";
    }
  }

  function reposition() {
    if (!root || !btn) return;

    const target = document.querySelector(TARGET_SELECTOR);
    if (!target) return;

    const r = target.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    btn.style.right = `${rr.right - r.right + 8}px`;
  }

  function attach(rootEl) {
    root = rootEl;
    if (getComputedStyle(root).position === "static") {
      root.style.position = "relative";
    }

    const b = makeButton();
    if (!root.contains(b)) root.appendChild(b);

    refreshStyle();
    reposition();
  }

  // wait once for stable root
  const attachObserver = new MutationObserver(() => {
    const r = document.querySelector(STABLE_ROOT_SELECTOR);
    if (r) {
      attachObserver.disconnect();
      attach(r);
    }
  });

  attachObserver.observe(document.body, { childList: true, subtree: true });

  // reactive updates (read-only)
  const reactiveObserver = new MutationObserver(() => {
    refreshStyle();
    reposition();
  });

  reactiveObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("popstate", refreshStyle);
  window.addEventListener("visibilitychange", refreshStyle);
})();
