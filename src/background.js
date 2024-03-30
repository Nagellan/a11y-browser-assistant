let actions = [];
let newtaburl = "";

// Open on install
chrome.runtime.onInstalled.addListener((object) => {
	// Inject Ally on install
	const manifest = chrome.runtime.getManifest();

	const injectIntoTab = (tab) => {
		const scripts = manifest.content_scripts[0].js;
		const s = scripts.length;

		for (let i = 0; i < s; i++) {
			chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: [scripts[i]],
			});
		}

		chrome.scripting.insertCSS({
			target: { tabId: tab.id },
			files: [manifest.content_scripts[0].css[0]],
		});
	};

	// Get all windows
	chrome.windows.getAll(
		{
			populate: true,
		},
		(windows) => {
			let currentWindow;
			const w = windows.length;

			for (let i = 0; i < w; i++) {
				currentWindow = windows[i];

				let currentTab;
				const t = currentWindow.tabs.length;

				for (let j = 0; j < t; j++) {
					currentTab = currentWindow.tabs[j];
					if (!currentTab.url.includes("chrome://") && !currentTab.url.includes("chrome-extension://") && !currentTab.url.includes("chrome.google.com")) {
						injectIntoTab(currentTab);
					}
				}
			}
		}
	);

	if (object.reason === "install") {
		// chrome.tabs.create({ url: "https://alyssax.com/omni/" });
	}
});

// Check when the extension button is clicked
chrome.action.onClicked.addListener((tab) => {
	chrome.tabs.sendMessage(tab.id, { request: "open-ally" });
});

// Listen for the open ally shortcut
chrome.commands.onCommand.addListener((command) => {
	if (command === "open-ally") {

		getCurrentTab().then((response) => {
			if (!response.url.includes("chrome://") && !response.url.includes("chrome.google.com")) {
				chrome.tabs.sendMessage(response.id, { request: "open-ally" });
			} else {
				chrome.tabs.create({
					url: "./newtab.html"
				}).then(() => {
					newtaburl = response.url;
					chrome.tabs.remove(response.id);
				})
			}
		});
	}
});

// Get the current tab
const getCurrentTab = async () => {
	const queryOptions = { active: true, currentWindow: true };
	const [tab] = await chrome.tabs.query(queryOptions);
	return tab;
}

const resetAlly = () => {
	getCurrentTab().then((response) => {
		actions = [
			{ title: "Request action", desc: "Request site action, like clicking on button or anything else", type: "action", action: "request-action", emoji: true, emojiChar: "🎯", keycheck: false },
			{ title: "Summarize", desc: "Get a brief description of page contents", type: "action", action: "summarize", emoji: true, emojiChar: "✨", keycheck: false },
		];
	});
}

// Check if tabs have changed and actions need to be fetched again
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => resetAlly());
chrome.tabs.onCreated.addListener((tab) => resetAlly());
chrome.tabs.onRemoved.addListener((tabId, changeInfo) => resetAlly());

const getActions = (sendResponse) => {
	resetAlly();
	sendResponse({ actions: actions });
}

const requestAction = () => {
	// отправить запрос в LLM
}

// Restore the new tab page (workaround to show Ally in new tab page)
function restoreNewTab() {
	getCurrentTab().then((response) => {
		chrome.tabs.create({
			url: newtaburl
		}).then(() => {
			chrome.tabs.remove(response.id);
		})
	})
}

const closeAlly = () => {
	getCurrentTab().then((response) => {
		chrome.tabs.sendMessage(response.id, { request: "close-ally" });
	});
}

// Receive messages from any tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.request) {
		case "get-actions":
			getActions(sendResponse)
			break;
		case "request-action":
			requestAction()
			break;
		case "restore-new-tab":
			restoreNewTab();
			break;
		case "close-ally":
			closeAlly()
			break;
	}
});

// Get actions
resetAlly();
