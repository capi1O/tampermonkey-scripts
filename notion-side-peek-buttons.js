// ==UserScript==
// @name         Notion Side Peek buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {
	// CSS styling
	const style = document.createElement('style');
	style.textContent = `

			.tm-notion-top-bar-btns-container {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
				white-space: nowrap;
				flex-grow: 1;
		}

		.tm-notion-side-peek-btns-container {
				margin-left: 0px;
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: flex-end;
				gap: 6px;
				white-space: nowrap;
				flex-grow: 1;
		}

		.tm-notion-side-peek-btn {
			padding: 6px 10px;
			border-radius: 6px;
			border: none;
			background: rgb(244,245,247);
			cursor: pointer;
			font-size: 13px;
			text-align: center;
			color: #333;
		}

		.tm-notion-side-peek-btn > span {
			font-size: 13px !important;
		}


		.tm-notion-side-peek-btn.active {
			background: rgb(35,131,226);
			color: #fff;
		}

		.tm-notion-hide, .shadow-cursor-breadcrumb, .notion-topbar-share-menu, .notion-topbar-favorite-button {
			display: none !important;
		}
	`;
	document.head.appendChild(style);


	const BLOCK_ID = "27a9f56f-f579-41f8-83ea-5147c7f99bb5";
	const PAGE_P_PARAM = "27a9f56ff57941f883ea5147c7f99bb5";

	const TOP_BAR_BTNS_CONTAINER_ID = "tm-notion-top-bar-btns-container";
	const SIDE_PEEK_BTNS_CONTAINER_ID = "tm-notion-side-peek-btns-container";
	const BACKLOG_BTN_ID = "tm-notion-sidepeek-backlog-btn";

	const NOTION_TOPBAR_SELECTOR = ".notion-topbar";
	const NOTION_BREADCRUMB_SELECTOR = ".shadow-cursor-breadcrumb";

	function isSidePeekOpen() {
		return location.search.includes(`p=${PAGE_P_PARAM}`);
	}

	function openSidePeek() {
		const a = document.querySelector(`[data-block-id="${BLOCK_ID}"] a`);
		a?.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true }));
	}

	let topBarButtonsContainer = null;
	let sidePeekButtonsContainer = null;
	function buildButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (topBarButtonsContainer) return topBarButtonsContainer;
		
		topBarButtonsContainer = document.createElement("div");
		topBarButtonsContainer.id = TOP_BAR_BTNS_CONTAINER_ID;
		topBarButtonsContainer.classList.add('tm-notion-top-bar-btns-container');
		
		sidePeekButtonsContainer = document.createElement("div");
		sidePeekButtonsContainer.id = SIDE_PEEK_BTNS_CONTAINER_ID;
		sidePeekButtonsContainer.classList.add('tm-notion-side-peek-btns-container');
		topBarButtonsContainer.appendChild(sidePeekButtonsContainer);

		return topBarButtonsContainer;
	}
	
	let backlogButton = null;
	function buildBacklogButton() {
		if (backlogButton) return backlogButton;

		backlogButton = document.createElement("button");
		backlogButton.id = BACKLOG_BTN_ID;
		backlogButton.innerHTML = `
			<span style="font-size:18px;">🗄️</span>
			<span style="font-size:16px;font-weight:600;margin-left:8px;">Backlog</span>
		`;
		backlogButton.classList.add('tm-notion-side-peek-btn');

		backlogButton.onclick = openSidePeek;
		backlogButton.onmouseenter = () => (backlogButton.style.transform = "translateY(-1px)");
		backlogButton.onmouseleave = () => (backlogButton.style.transform = "translateY(0)");

		sidePeekButtonsContainer.appendChild(backlogButton);
	}

	function refreshBacklogButtonStyle() {
		if (!backlogButton) return;

		backlogButton.classList.toggle("active", isSidePeekOpen())
	}


	// TODO: reuse
	function attach(topbar, breadcrumb) {
		if (getComputedStyle(topbar).position === "static") {
			topbar.style.position = "relative";
		}

		const b = buildButtonsContainer();
		if (!topbar.contains(b)) {
			breadcrumb.after(b);
		}
	}

	// TODO: reuse
	const attachObserver = new MutationObserver(() => {
		const topbar = document.querySelector(NOTION_TOPBAR_SELECTOR);
		if (topbar) {
				const breadcrumb = topbar.querySelector(NOTION_BREADCRUMB_SELECTOR);
				if (breadcrumb) {
					attachObserver.disconnect();
					// console.log('topbar and breadcrumb found, attaching');
					attach(topbar, breadcrumb);
					buildBacklogButton();
				}
				// else console.log('breadcrumb not found');

				// wait for flexible space to appear then hide it
				hideFlexibleSpace(topbar);
		}
		// else  console.log('topbar not found');
	});

	attachObserver.observe(document.body, { childList: true, subtree: true });

	window.addEventListener("popstate", refreshBacklogButtonStyle);
	window.addEventListener("visibilitychange", refreshBacklogButtonStyle);


	// hide top bar "flex" div (cannot in CSS only)
	function hideFlexibleSpace(topbar) {
		// console.log('hideFlexibleSpace')
		const flexSpaceObserver = new MutationObserver(() => {
			const potentialFlexibleSpace = [...topbar.querySelectorAll('.notion-selectable-container > div > div')]
			// const potentialFlexibleSpace = topbar.querySelector('.notion-selectable-container > div > div [style*="flex-grow: 1"][style*="flex-shrink: 1"]')

			if (potentialFlexibleSpace.length > 0) {
				// console.log(`found ${potentialFlexibleSpace.length} potential flexible space`);

				// const flexibleSpace = potentialFlexibleSpace
				potentialFlexibleSpace
					.forEach(div => {
						const followedByActionButtons = div.nextElementSibling?.classList.contains('notion-topbar-action-buttons');
						// const style = getComputedStyle(div);
						// const isFlex = style.flexGrow === '1' && style.flexShrink === '1';
						const s = div.getAttribute('style') || '';
						const isFlex = /flex-grow\s*:\s*1/.test(s) && /flex-shrink\s*:\s*1/.test(s);

						if (isFlex) {// && followedByActionButtons
							// console.log('found flexible space')
							flexSpaceObserver.disconnect();
							div.classList.add("tm-notion-hide");
						}
					});
			}
			// else console.log('found no potential flexible space')
		});
		flexSpaceObserver.observe(topbar, { childList: true, subtree: true });
	}

})();
