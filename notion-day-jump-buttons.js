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
	const BTNS_CONTAINER_ID = "tm-notion-day-jump";
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

	function makeButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (buttonsContainer) return buttonsContainer;

		buttonsContainer = document.createElement("div");
		buttonsContainer.id = BTNS_CONTAINER_ID;
		buttonsContainer.classList.add('tm-notion-day-jump-btns-container');

		// root.appendChild(buttonsContainer);
		return buttonsContainer;
	}

	// refreshButtons recreates buttons and therefore active classes are skipped
	function refreshButtons() {

		// console.log('refreshButtons');

		// reset to empty
		// buttonsContainer.innerHTML = "";
		// get existing buttons
		const existingLabels = [...buttonsContainer.children].map(btn => btn.textContent);
		// console.log(`refreshButtons - existingLabels: ${existingLabels.join(' ')}`);
		// console.log(`refreshButtons - existingLabels`, existingLabels);
		// [...buttonsContainer.children].forEach(btn => console.log(btn.label));

		const groupElements = findGroupElements();
		if (!groupElements.length) {
			// console.log('refreshButtons - found no group');
			return;
		}
		// else console.log(`refreshButtons - found ${groupElements.length} groups`); 

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

	const OFFSET = 200;

	function getActiveGroup(groups, OFFSET = 300) {

		let active; // = groups[0];

		for (const g of groups) {
			const top = g.el.getBoundingClientRect().top;
			if (top - OFFSET <= 0) active = g;
			else break;
		}
		return active;
	}

	function updateActiveGroup() {
		if (!buttonsContainer) return;

		const groups = findGroupElements();
		if (!groups.length) return;

		const active = getActiveGroup(groups, OFFSET);

		// if no active group find, return so we keep the last active one
		if (!active) {
			console.log('updateActiveGroup - found no active group');
			return;
		}
		else console.log(`updateActiveGroup - found active group ${active.label}`);

		[...buttonsContainer.children].forEach(btn =>
			btn.classList.toggle("active", btn.textContent === active.label)
		);
	}

	function reposition() {
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
			refreshButtons();
		});

		listObserver.observe(listRoot, {
			childList: true,
			subtree: true
		});
	}

	function attach(rootEl) {
		root = rootEl;
		if (getComputedStyle(root).position === "static") {
			root.style.position = "relative";
		}

		const b = makeButtonsContainer();
		if (!root.contains(b)) root.appendChild(b);

		// refreshStyle();
		reposition(); // reposition container
		refreshButtons(); // first call
		observeListView(); // will trigger refreshButtons() if listview changes
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

	window.addEventListener("resize", reposition);
	window.addEventListener("scroll", reposition, true);
	window.addEventListener("scroll", updateActiveGroup, true);
	// window.addEventListener("popstate", refreshStyle);
	// window.addEventListener("visibilitychange", refreshStyle);

})();
