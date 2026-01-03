// ==UserScript==
// @name         Notion Side Peek buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {
	// CSS styling
	const style = document.createElement('style');
	style.textContent = `

		.tm-notion-top-bar-btns-container {
			position: absolute;
			top: 6px;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			flex-wrap: nowrap;
			padding-left: 4px;
			padding-right: 12px;
		}

		.tm-notion-side-peek-btns-container {
			margin-left: 8px;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			gap: 6px;
			flex-wrap: nowrap;
			flex-grow: 1;
			flex-shrink: 0;
			flex-basis: auto;
			min-width: max-content;
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


	// TOP BAR BUTTONS CONTAINER
	const NOTION_TOPBAR_SELECTOR = ".notion-topbar";
	const NOTION_BREADCRUMB_SELECTOR = ".shadow-cursor-breadcrumb";
	const TOP_BAR_BTNS_CONTAINER_ID = "tm-notion-top-bar-btns-container";

	// buttons container is added to top bar (.notion-frame) and manually styled to match target width
	const TARGET_SELECTOR =
	".notion-frame > .notion-selectable-container > .notion-scroller.vertical > div > .layout > .layout-content";

	let topBarButtonsContainer = null;
	function buildButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (topBarButtonsContainer) return topBarButtonsContainer;
		
		topBarButtonsContainer = document.createElement("div");
		topBarButtonsContainer.id = TOP_BAR_BTNS_CONTAINER_ID;
		topBarButtonsContainer.classList.add('tm-notion-top-bar-btns-container');

		return topBarButtonsContainer;
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
					repositionTopBarButtonsContainer();
					buildSidePeekButtonsContainer();
					buildBacklogButton();
				}
				// else console.log('breadcrumb not found');

				// wait for flexible space to appear then hide it
				hideFlexibleSpace(topbar);
		}
		// else  console.log('topbar not found');
	});

	attachObserver.observe(document.body, { childList: true, subtree: true });


	function repositionTopBarButtonsContainer() {
		if (!topBarButtonsContainer) return;

		const target = document.querySelector(TARGET_SELECTOR);
		if (!target) return;

		const targetRect = target.getBoundingClientRect();
		// console.log('layout content rect:', targetRect);
		topBarButtonsContainer.style.left = `${targetRect.left}px`;
		topBarButtonsContainer.style.width = `${targetRect.width - 2}px`;
	}

	window.addEventListener("resize", repositionTopBarButtonsContainer);
	window.addEventListener("scroll", repositionTopBarButtonsContainer, true);

	// reactive updates (read-only)
	const reactiveObserver = new MutationObserver(() => {
		refreshBacklogButtonStyle();
		repositionTopBarButtonsContainer();
	});

	reactiveObserver.observe(document.body, { childList: true, subtree: true });

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


	// SIDE PEEK BUTTONS
	const PAGE_P_PARAM = "27a9f56ff57941f883ea5147c7f99bb5";
	const SIDE_PEEK_BTNS_CONTAINER_ID = "tm-notion-side-peek-btns-container";

	let sidePeekButtonsContainer = null;
	function buildSidePeekButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		
		sidePeekButtonsContainer = document.createElement("div");
		sidePeekButtonsContainer.id = SIDE_PEEK_BTNS_CONTAINER_ID;
		sidePeekButtonsContainer.classList.add('tm-notion-side-peek-btns-container');
		topBarButtonsContainer.appendChild(sidePeekButtonsContainer);

		return sidePeekButtonsContainer;
	}
	function isSidePeekOpen() {
		return /[?&]p=/.test(location.search);
	}


	// BACKLOG BUTTON
	const BACKLOG_BUTTON_BLOCK_ID = "27a9f56f-f579-41f8-83ea-5147c7f99bb5";
	const BACKLOG_BTN_ID = "tm-notion-sidepeek-backlog-btn";
	function isBacklogOpenInSidePeek() {
		return location.search.includes(`p=${PAGE_P_PARAM}`);
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

		backlogButton.onclick = openBacklogInSidePeek;
		backlogButton.onmouseenter = () => (backlogButton.style.transform = "translateY(-1px)");
		backlogButton.onmouseleave = () => (backlogButton.style.transform = "translateY(0)");

		sidePeekButtonsContainer.appendChild(backlogButton);
	}

	function refreshBacklogButtonStyle() {
		if (!backlogButton) return;

		backlogButton.classList.toggle("active", isBacklogOpenInSidePeek())
	}

	window.addEventListener("popstate", refreshBacklogButtonStyle);
	window.addEventListener("visibilitychange", refreshBacklogButtonStyle);

	function openBacklogInSidePeek() {

		if (isSidePeekOpen()) {

			const a = document.querySelector(`[data-block-id="${BACKLOG_BUTTON_BLOCK_ID}"] a`);
			if (a) {

				// Method 1: simulate alt click
				// a.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true }));

				// Method 2: simulate alt click v2
				// const opts = {
				// 	bubbles: true,
				// 	cancelable: true,
				// 	altKey: true,
				// 	button: 0,
				// 	buttons: 1
				// };
				// a.dispatchEvent(new PointerEvent("pointerdown", opts));
				// a.dispatchEvent(new MouseEvent("mousedown", opts));
				// a.dispatchEvent(new MouseEvent("mouseup", opts));
				// a.dispatchEvent(new MouseEvent("click", opts));


				// Method 3: simulate Alt key down, click then Alt key up
				// window.dispatchEvent(
				// 	new KeyboardEvent("keydown", {
				// 		key: "Alt",
				// 		altKey: true,
				// 		bubbles: true
				// 	})
				// );
				// a.click();
				// window.dispatchEvent(
				// 	new KeyboardEvent("keyup", {
				// 		key: "Alt",
				// 		bubbles: true
				// 	})
				// );

				// Method 4: Create a temporary link element with Alt key to trigger side peek
				// 	const a = document.createElement('a');
				// 	a.href = 'https://www.notion.so/cap1o/Planning-0d0b47fba5e647f6b89a7d6967e93c3a?p=27a9f56ff57941f883ea5147c7f99bb5&pm=s';
				// 	a.style.display = 'none';
				// 	document.body.appendChild(a);
				// 	const evt = new MouseEvent('click', {
				// 			bubbles: true,
				// 			cancelable: true,
				// 			altKey: true   // Alt triggers Side Peek
				// 	});
				// 	a.dispatchEvent(evt);
				// 	document.body.removeChild(a);

				// Method 5: change URL
				// const url = new URL(location.href); //new URL(window.location);
				// url.searchParams.set('p', '27a9f56ff57941f883ea5147c7f99bb5');
				// url.searchParams.set('pm', 's');
				// history.pushState(null, '', url); // changes URL without reload
				// trigger some Notion JS function:
				// window.dispatchEvent(new Event('popstate'));
			}
			else console.log('backlog button not found')
		}
		else openSidePeek();


		// if (isSidePeekOpen()) {
		// 	console.log('close side peek');

		// 	// simulate Esc key press
		// 	const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
		// 	document.dispatchEvent(escEvent);
		// }
		// else {
		// 	console.log('open side peek');

		// }
	}
})();
