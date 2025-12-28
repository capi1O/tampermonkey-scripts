// ==UserScript==
// @name         Notion Days Jump buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {

	// CSS styling
	const style = document.createElement('style');
	style.textContent = `

		.tm-notion-day-jump-btns-container {
			margin-left: 0px;
			display: flex;
			flex-direction: row;
			align-items: flex-start;
			gap: 6px;
			z-index: 9999;
			width: max-content;
			white-space: nowrap;
		}

		.tm-notion-day-jump-btn {
			padding: 6px 10px;
			border-radius: 6px;
			border: none;
			background: rgb(244,245,247);
			cursor: pointer;
			font-size: 13px;
			text-align: center;
			color: #333;
		}

		.tm-notion-day-jump-btn.active {
			background: rgb(35,131,226);
			color: #fff;
		}

		.tm-notion-hide, .notion-topbar-share-menu, .notion-topbar-favorite-button {
			display: none !important;
		}
	`;
	document.head.appendChild(style);


	const GROUP_HEADER_SELECTOR = ".notion-frame .notion-collection_view-block"; 
	const BTNS_CONTAINER_ID = "tm-notion-day-jump-btns-container";
	const LIST_VIEW_ROOT_SELECTOR =
	".notion-page-content > .notion-selectable.notion-transclusion_reference-block";

	const NOTION_TOPBAR_SELECTOR = ".notion-topbar";
	const NOTION_BREADCRUMB_SELECTOR = ".shadow-cursor-breadcrumb";

	let buttonsContainer = null;
	let root = null;


	function findGroups() {
		const candidates = document.querySelectorAll(GROUP_HEADER_SELECTOR);

		const groups = [];

		candidates.forEach(element => {
			// Exclude list items
			if (element.classList.contains("notion-collection-item")) return;

			// Must have a caret button
			const caret = element.querySelector(':scope > div[role="button"]');
			if (!caret) return;

			// Must have a text label (second div, text-only)
			const labelDiv = [...element.children].find(c =>
				c.tagName === "DIV" &&
				c.children.length === 0 &&
				c.innerText?.trim()
			);
			if (!labelDiv) return;

			// Must have popup-origin block (count / controls)
			const popup = element.querySelector('[data-popup-origin="true"] div');
			if (!popup) return;

			const main = element.closest('[style*="contain: layout"]');
			if (!main) return;

			groups.push({
				label: labelDiv.innerText.trim(),
				header: element,
				element: main
			});
		});

		groups.sort(
			(a, b) =>
				a.element.getBoundingClientRect().top -
				b.element.getBoundingClientRect().top
		);

		return groups;
	}


	
	function getScroller() {
		return document.querySelector(".notion-frame > .notion-selectable-container > .notion-scroller.vertical");
	}
	
	function scrollToGroup({ header, label, element }) {

		const scroller = getScroller();
		if (!scroller) return;

		const scrollerRect = scroller.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();

		const currentScrollValue = scroller.scrollTop;
		const scrollViewTopFromViewport = scrollerRect.top;
		const nextGroupTopFromViewport = elementRect.top;


		const nextGroupTopFromScrollView = nextGroupTopFromViewport - scrollViewTopFromViewport;
		// const goingup = (nextGroupTopFromScrollView < 0) ? true : false;

		const nextScrollValue = currentScrollValue + nextGroupTopFromScrollView;

// 		console.log(
// `%c
// scrolling ${goingup ? 'up' : 'down'} to group ${label}\n
// current scroll value: ${currentScrollValue}\n
// scroll view position from top of VP: ${scrollViewTopFromViewport}\n
// next group position from top of VP: ${nextGroupTopFromViewport}\n
// next group position from top of scroll view: ${nextGroupTopFromScrollView}\n
// next scroll value ${nextScrollValue}\n
// `, "color:#3b82f6");

		scroller.scrollTo({
			top: nextScrollValue,
			behavior: "smooth"
		});

		scroller.focus?.();
	}

	function buildButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (buttonsContainer) return buttonsContainer;

		buttonsContainer = document.createElement("div");
		buttonsContainer.id = BTNS_CONTAINER_ID;
		buttonsContainer.classList.add('tm-notion-day-jump-btns-container');

		return buttonsContainer;
	}

	function formatLabel(raw) {
		const d = new Date(raw);
		if (isNaN(d)) return raw;

		return new Intl.DateTimeFormat("fr-FR", {
			weekday: "long",
			day: "numeric"
		})
			.format(d)
			.replace(/^\w/, c => c.toUpperCase());
	}


	// add or update day buttons
	function updateButtons() {

		// reset to empty
		// buttonsContainer.innerHTML = "";
		// get existing buttons
		const existingLabels = [...buttonsContainer.children].map(btn => btn.value);
		// console.log(`updateButtons - existingLabels: ${existingLabels.join(' ')}`);
		// console.log(`updateButtons - existingLabels`, existingLabels);
		// [...buttonsContainer.children].forEach(btn => console.log(btn.label));

		const groups = findGroups();
		if (!groups.length) {
			// console.log('updateButtons - found no group');
			return;
		}
		// else console.log(`updateButtons - found ${groupElements.length} groups`); 

		groups.forEach(({ label, element, header }) => {
			
			// create button if it does not already exists
			if (!existingLabels.includes(label)) {
				const btn = document.createElement("button");
				btn.value = label;
				btn.textContent = formatLabel(label);
				btn.classList.add('tm-notion-day-jump-btn');
				btn.onclick = (event) => scrollToGroup({ element, header, label });
				buttonsContainer.appendChild(btn);
			}
		});
	}

	const VISIBILITY_OFFSET = 90; // height of top header .notion-topbar

	let lastActiveGroup = null;
	function getActiveGroup(groups) {

		let activeGroup;

		for (const g of groups) {
			const top = g.element.getBoundingClientRect().top; // top relative to viewport
			if (top - VISIBILITY_OFFSET <= 0) activeGroup = g;
			else break;
		}

		// if no group currently visible, return the last active one or first one if none (on load)
		if (!activeGroup) activeGroup = lastActiveGroup || groups[0];

		if (activeGroup != lastActiveGroup) {
			// keep ref for next run
			lastActiveGroup = activeGroup;
			return activeGroup;
		}
		// otherwise return null to indicate no change
		else return null;

	}

	function updateActiveButton() {
		if (!buttonsContainer) {
			console.log('updateActiveButton - found no buttons container');
			return;
		}
		const groups = findGroups();
		if (!groups.length) {
			console.log('updateActiveButton - found no groups');
			return;
		}

		const active = getActiveGroup(groups);

		// if no active group returned it means it has not changed, return so we don't update unnecessarily
		if (!active) {
			console.log('updateActiveButton - found no active group');
			return;
		}
		else console.log(`updateActiveButton - found active group ${active.label}`);

		[...buttonsContainer.children].forEach(btn =>
			btn.classList.toggle("active", btn.value === active.label)
		);
	}

	let listObserver = null;

	function observeListView() {
		if (listObserver) return;

		const listRoot = document.querySelector(LIST_VIEW_ROOT_SELECTOR);
		if (!listRoot) return;

		listObserver = new MutationObserver(() => {
			updateButtons();
		});

		listObserver.observe(listRoot, {
			childList: true,
			subtree: true
		});
	}

	function observeScroll() {
		const scroller = getScroller();
		if (!scroller) return;

		scroller.addEventListener("scroll", updateActiveButton, { passive: true });
	}

	function waitForListStabilized(cb, delay = 150) {
		let last = 0;
		let stableTimer = null;

		const obs = new MutationObserver(() => {
			const groups = findGroups();
			if (!groups.length) return;

			const totalHeight = groups.reduce(
				(s, g) => s + g.element.getBoundingClientRect().height,
				0
			);

			if (Math.abs(totalHeight - last) < 2) {
				if (!stableTimer) {
					stableTimer = setTimeout(() => {
						obs.disconnect();
						cb();
					}, delay);
				}
			} else {
				clearTimeout(stableTimer);
				stableTimer = null;
				last = totalHeight;
			}
		});

		obs.observe(
			document.querySelector(LIST_VIEW_ROOT_SELECTOR),
			{ childList: true, subtree: true }
		);
	}

	// function nudgeScroller() {
	// 	const scroller = getScroller();
	// 	if (!scroller) return;
	// 	scroller.scrollTop += 1;
	// 	scroller.scrollTop -= 1;
	// }


	function attach(topbar, breadcrumb) {
		if (getComputedStyle(topbar).position === "static") {
			topbar.style.position = "relative";
		}

		const b = buildButtonsContainer();
		if (!topbar.contains(b)) {
			breadcrumb.after(b);
		}

		observeListView(); // will trigger updateButtons() if listview changes

		waitForListStabilized(() => { updateActiveButton(); }); // wait for list to load and update

		observeScroll(); // will trigger updateActiveButton() if scroll

		// nudgeScroller();

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

					const breadcrumbButtons = [...breadcrumb.querySelectorAll("div[role='button']")];
					if (breadcrumbButtons.length > 0) hidePageLocationButton(breadcrumbButtons);
					// else console.log('no buttons found in breadcrumb');

				}
				else console.log('breadcrumb not found');

				// wait for flexible space to appear then hide it
				hideFlexibleSpace(topbar);

		}
		// else  console.log('topbar not found');
	});
	
	attachObserver.observe(document.body, { childList: true, subtree: true });

	
	// hide page location ("Private") button (cannot in CSS only)
	function hidePageLocationButton(breadcrumbButtons) {
		// console.log(`hidePageLocationButton, found ${breadcrumbButtons.length} buttons`);
		breadcrumbButtons.forEach(btn => {
			if (btn.innerText?.trim() === "Private") {
				btn.classList.add("tm-notion-hide");
			}
		});
	}

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
						const style = getComputedStyle(div);
						const isFlex = style.flexGrow === '1' && style.flexShrink === '1';

						if (isFlex) {// && followedByActionButtons
							console.log('found flexible space')
							flexSpaceObserver.disconnect();
							div.classList.add("tm-notion-hide");
						}
					});
			}
			else console.log('found no potential flexible space')
		});
		flexSpaceObserver.observe(topbar, { childList: true, subtree: true });
	}

	// const breadcrumbObserver = new MutationObserver(() => {
	// 	const breadcrumb = document.querySelector(NOTION_TOPBAR_BREADCRUMB_SELECTOR);
	// 	if (breadcrumb) {
	// 		console.log('breadcrumb found');
	// 		hideTopBarButtons(breadcrumb);
	// 	}
	// 	else console.log('breadcrumb not found');
	// });

	// breadcrumbObserver.observe(breadcrumb, {
	// 	childList: true,
	// 	subtree: true
	// });

})();
