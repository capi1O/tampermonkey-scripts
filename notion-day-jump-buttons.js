// ==UserScript==
// @name         Notion Days Jump buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {

	// CSS styling
	const style = document.createElement('style');
	style.textContent = `

		.tm-notion-day-jump-btns-container {
			overflow: hidden;
			min-width: 0;
			flex-grow: 0;
			flex-shrink: 1;
			flex-basis: auto;
		}

		.tm-notion-day-jump-btns-wrapper {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			gap: 6px;
			flex-wrap: nowrap;
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
			white-space: nowrap;
		}

		.tm-notion-day-jump-btn.active {
			background: rgb(35,131,226);
			color: #fff;
		}
	`;
	document.head.appendChild(style);


	const GROUP_HEADER_SELECTOR = ".notion-frame .notion-collection_view-block";
	const TOP_BAR_BTNS_CONTAINER_ID = "tm-notion-top-bar-btns-container"; // TODO: reuse
	const BTNS_CONTAINER_ID = "tm-notion-day-jump-btns-container";
	const LIST_VIEW_ROOT_SELECTOR =
	".notion-page-content > .notion-selectable.notion-transclusion_reference-block";

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

	let buttonsContainer = null;
	function buildButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (buttonsContainer) return buttonsContainer;

		buttonsContainer = document.createElement("div");
		buttonsContainer.id = BTNS_CONTAINER_ID;
		buttonsContainer.classList.add('tm-notion-day-jump-btns-container');

		buttonsContainerWrapper = document.createElement("div");
		buttonsContainerWrapper.classList.add('tm-notion-day-jump-btns-wrapper');
		buttonsContainer.appendChild(buttonsContainerWrapper);

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
				buttonsContainer.querySelector('div').appendChild(btn);
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
			// console.log('updateActiveButton - found no buttons container');
			return;
		}
		const groups = findGroups();
		if (!groups.length) {
			// console.log('updateActiveButton - found no groups');
			return;
		}

		const active = getActiveGroup(groups);

		// if no active group returned it means it has not changed, return so we don't update unnecessarily
		if (!active) {
			// console.log('updateActiveButton - found no active group');
			return;
		}
		// else console.log(`updateActiveButton - found active group ${active.label}`);

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


	function attach(topBarButtonsContainer) {

		const b = buildButtonsContainer();
		if (!topBarButtonsContainer.contains(b)) {
			// insert buttons container as first child
			// topBarButtonsContainer.prepend(b);
			topBarButtonsContainer.insertBefore(b, topBarButtonsContainer.firstChild);
		}

		observeListView(); // will trigger updateButtons() if listview changes

		waitForListStabilized(() => { updateActiveButton(); }); // wait for list to load and update

		observeScroll(); // will trigger updateActiveButton() if scroll

		// nudgeScroller();

	}

	// TODO: reuse
	const attachObserver = new MutationObserver(() => {
		const topBarButtonsContainer = document.getElementById(TOP_BAR_BTNS_CONTAINER_ID);
		if (topBarButtonsContainer) {
			// console.log('topbar and breadcrumb found, attaching');
			attach(topBarButtonsContainer);
		}
		// else  console.log('topbar not found');
	});
	
	attachObserver.observe(document.body, { childList: true, subtree: true });


})();
