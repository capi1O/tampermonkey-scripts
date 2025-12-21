// ==UserScript==
// @name         Notion day jump buttons
// @match        https://www.notion.so/*
// ==/UserScript==

(() => {
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

	// function findGroupElements() {
	// 	const groups = [...document.querySelectorAll(GROUP_SELECTOR)]
	// 		.filter(el => el.children.length > 0) // skip empty ones
	// 		.slice(3); // skip first elements which are not groups (/!\)
	// 	return groups;
	// }

	// function groupName(groupElement) {
	// 	// get second child (a div)
	// 	const text = groupElement.children[1].innerText.trim();
	// 	return text;
	// }

	// function findGroupElements() {
	// 	const blocks = document.querySelectorAll(GROUP_SELECTOR);
	// 	const groups = [];

	// 	blocks.forEach(block => {
	// 		// find the first text-only element (group header)
	// 		const header = [...block.querySelectorAll("div")]
	// 			.find(el =>
	// 				el.children.length === 0 &&
	// 				el.innerText &&
	// 				el.innerText.trim().length > 0
	// 			);

	// 		if (!header) return;

	// 		// group container = closest meaningful wrapper
	// 		const groupElement = header.closest(".notion-collection_view-block");
	// 		if (!groupElement) return;

	// 		groups.push({
	// 			label: header.innerText.trim(),
	// 			el: groupElement
	// 		});
	// 	});

	// 	// deduplicate (Notion sometimes nests)
	// 	return [...new Map(groups.map(g => [g.label, g])).values()];
	// }

	function findGroupElements() {
		const candidates = document.querySelectorAll(GROUP_SELECTOR);
		// 	".notion-selectable.notion-collection_view-block"
		// );

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

		return groups;
	}



	function scrollToGroup(el) {
		el.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	function makeButtonsContainer() {
		// let buttonsContainer = document.getElementById(BTNS_CONTAINER_ID);
		if (buttonsContainer) return buttonsContainer;

		buttonsContainer = document.createElement("div");
		buttonsContainer.id = BTNS_CONTAINER_ID;

		Object.assign(buttonsContainer.style, {
			position: "absolute",
			top: "60px",
			left: "12px",
			display: "flex",
			flexDirection: "row",
			gap: "6px",
			zIndex: 9999
		});

		// root.appendChild(buttonsContainer);
		return buttonsContainer;
	}

	function refreshButtons() {

		console.log('refreshButtons');

		// const root = document.querySelector(ROOT_SELECTOR);
		// if (!root) {
		// 	console.log('refreshButtons - root not found');
		// 	return;
		// }
		// else console.log('refreshButtons - root found');


		// if (getComputedStyle(root).position === "static") {
		// 	root.style.position = "relative";
		// }

		// const buttonsContainer = createButtonsContainer(root);
		// if (!buttonsContainer) return;

		// reset to empty
		buttonsContainer.innerHTML = "";

		const groupElements = findGroupElements();
		if (!groupElements.length) {
			console.log('refreshButtons - found no group');
			return;
		}
		else console.log(`refreshButtons - found ${groupElements.length} groups`); 

		groupElements.forEach(({ label, el }) => {

			const btn = document.createElement("button");
			btn.textContent = label;

			Object.assign(btn.style, {
				padding: "6px 10px",
				borderRadius: "6px",
				border: "none",
				background: "rgb(244,245,247)",
				cursor: "pointer",
				fontSize: "13px",
				textAlign: "left",
				color: "red"
			});

			btn.onclick = () => scrollToGroup(el);
			buttonsContainer.appendChild(btn);
		});
	}

	// check day currently in view
	// function refreshStyle() {
	//   if (!buttonsContainer) return;
	//   if (isSidePeekOpen()) {
	//     buttonsContainer.style.background = "rgb(35,131,226)";
	//     buttonsContainer.style.color = "#fff";
	//   } else {
	//     buttonsContainer.style.background = "rgb(244,245,247)";
	//     buttonsContainer.style.color = "#333";
	//   }
	// }

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


	// watch list view (must not include buttons container otherwise infinite loop)
	// const reactiveObserver = new MutationObserver(() => {
	//   // refreshStyle();
	//   reposition();
	// 	refreshButtons();
	// });

	// reactiveObserver.observe(document.body, { childList: true, subtree: true });

	window.addEventListener("resize", reposition);
	window.addEventListener("scroll", reposition, true);
	// window.addEventListener("popstate", refreshStyle);
	// window.addEventListener("visibilitychange", refreshStyle);







	// Observe list rebuilds (grouping, filters, navigation)
	// const mo = new MutationObserver(refreshButtons);
	// mo.observe(document.body, { childList: true, subtree: true });

	//   // reactive updates (read-only)
	// const reactiveObserver = new MutationObserver(() => {
	//   // refreshStyle();
	//   reposition();
	// 	refreshButtons();
	// });
	// reactiveObserver.observe(document.body, { childList: true, subtree: true });

})();
