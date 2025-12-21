// ==UserScript==
// @name         Notion day jump buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {

	// CSS styling
	const style = document.createElement('style');
	style.textContent = `

		.tm-notion-day-jump-btns-container {
			position: absolute;
			top: 60px;
			left: 12px;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
			z-index: 9999;
		}

		.tm-notion-day-jump-btn {
			padding: 6px 10px;
			border-radius: 6px;
			border: none;
			background: rgb(244,245,247);
			cursor: pointer;
			font-size: 13px;
			text-align: left;
			color: #333;
		}

		.tm-notion-day-jump-btn.active {
			background: rgb(35,131,226);
			color: #fff;
		}
	`;
	document.head.appendChild(style);


	const GROUP_SELECTOR = ".notion-frame .notion-collection_view-block"; 
	const BTNS_CONTAINER_ID = "tm-notion-day-jump-btns-container";
	const LIST_VIEW_ROOT_SELECTOR =
	".notion-page-content > .notion-selectable.notion-transclusion_reference-block";

	// buttons are added to root element (.notion-frame) and manually positionned relatively to target because it is not possible to add them directly to target (blocked by Notion)
	const STABLE_ROOT_SELECTOR = ".notion-frame";
	const TARGET_SELECTOR =
		".notion-frame > .notion-selectable-container > .notion-scroller.vertical > div > .layout > .layout-content";

	let buttonsContainer = null;
	let root = null;


	function findGroupElements() {
		const candidates = document.querySelectorAll(GROUP_SELECTOR);

		const groups = [];

		candidates.forEach(el => {
			// Exclude list items
			if (el.classList.contains("notion-collection-item")) return;

			// Must have a caret button
			const caret = el.querySelector(':scope > div[role="button"]');
			if (!caret) return;

			// Must have a text label (second div, text-only)
			const labelDiv = [...el.children].find(c =>
				c.tagName === "DIV" &&
				c.children.length === 0 &&
				c.innerText?.trim()
			);
			if (!labelDiv) return;

			// Must have popup-origin block (count / controls)
			const popup = el.querySelector('[data-popup-origin="true"] div');
			if (!popup) return;

			groups.push({
				el,
				label: labelDiv.innerText.trim()
			});
		});

		groups.sort(
			(a, b) =>
				a.el.getBoundingClientRect().top -
				b.el.getBoundingClientRect().top
		);

		return groups;
	}


	
	function getScroller() {
		return document.querySelector(".notion-frame > .notion-selectable-container > .notion-scroller.vertical");
	}
	
	const SCROLL_OFFSET = 25;

	function scrollToGroup(el) {

		const scroller = getScroller();
		if (!scroller) return;

		const scrollerRect = scroller.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();

		const y =
			scroller.scrollTop +
			(elRect.top - scrollerRect.top) - SCROLL_OFFSET;

		scroller.scrollTo({
			top: y,
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

	// add or update day buttons
	function updateButtons() {

		// reset to empty
		// buttonsContainer.innerHTML = "";
		// get existing buttons
		const existingLabels = [...buttonsContainer.children].map(btn => btn.textContent);
		// console.log(`updateButtons - existingLabels: ${existingLabels.join(' ')}`);
		// console.log(`updateButtons - existingLabels`, existingLabels);
		// [...buttonsContainer.children].forEach(btn => console.log(btn.label));

		const groupElements = findGroupElements();
		if (!groupElements.length) {
			// console.log('updateButtons - found no group');
			return;
		}
		// else console.log(`updateButtons - found ${groupElements.length} groups`); 

		groupElements.forEach(({ label, el }) => {
			
			// create button if it does not already exists
			if (!existingLabels.includes(label)) {
				const btn = document.createElement("button");
				btn.textContent = label;
				btn.classList.add('tm-notion-day-jump-btn');
				btn.onclick = () => scrollToGroup(el);
				buttonsContainer.appendChild(btn);
			}
		});
	}

	const VISIBILITY_OFFSET = 90;

	let lastActiveGroup = null;
	function getActiveGroup(groups) {

		let activeGroup;

		for (const g of groups) {
			const top = g.el.getBoundingClientRect().top;
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
		const groups = findGroupElements();
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
			btn.classList.toggle("active", btn.textContent === active.label)
		);
	}

	function updateContainerPosition() {
		if (!root || !buttonsContainer) return;

		const target = document.querySelector(TARGET_SELECTOR);
		if (!target) return;

		const r = target.getBoundingClientRect();
		const rr = root.getBoundingClientRect();
		buttonsContainer.style.right = `${rr.left - r.left + 8}px`;
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
			const groups = findGroupElements();
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

	function nudgeScroller() {
		const scroller = getScroller();
		if (!scroller) return;
		scroller.scrollTop += 1;
		scroller.scrollTop -= 1;
	}


	function attach(rootEl) {
		root = rootEl;
		if (getComputedStyle(root).position === "static") {
			root.style.position = "relative";
		}

		const b = buildButtonsContainer();
		if (!root.contains(b)) root.appendChild(b);

		// refreshStyle();
		updateContainerPosition(); // first call
		observeListView(); // will trigger updateButtons() if listview changes

		waitForListStabilized(() => { updateActiveButton(); }); // wait for list to load and update

		observeScroll(); // will trigger updateActiveButton() if scroll
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

	window.addEventListener("resize", updateContainerPosition);
	window.addEventListener("scroll", updateContainerPosition, true);
	
	// window.addEventListener("scroll", updateActiveButton, true);

	// window.addEventListener("popstate", refreshStyle);
	// window.addEventListener("visibilitychange", refreshStyle);

})();
