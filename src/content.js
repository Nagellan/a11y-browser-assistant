// Workaround to capture Esc key on certain sites
var isOpen = false;
document.onkeyup = (e) => {
	if (e.key == "Escape" && isOpen) {
		chrome.runtime.sendMessage({ request: "close-ally" })
	}
}

$(document).ready(() => {
	var actions = [];

	// Append the ally into the current page
	$.get(chrome.runtime.getURL('/content.html'), (data) => {
		$(data).appendTo('body');

		// Get checkmark image for toast
		$("#ally-extension-toast img").attr("src", chrome.runtime.getURL("assets/check.svg"));

		// Request actions from the background
		chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
			actions = response.actions;
		});

		// New tab page workaround
		if (window.location.href == "chrome-extension://mpanekjjajcabgnlbabmopeenljeoggm/newtab.html") {
			isOpen = true;
			$("#ally-extension").removeClass("ally-closing");
			window.setTimeout(() => {
				$("#ally-extension input").focus();
			}, 100);
		}
	});

	function renderAction(action, index, keys, img) {
		var skip = "";
		if (action.action == "request-action") {
			skip = "style='display:none'";
		}
		if (index != 0) {
			$("#ally-extension #ally-list").append("<div class='ally-item' " + skip + " data-index='" + index + "' data-type='" + action.type + "'>" + img + "<div class='ally-item-details'><div class='ally-item-name'>" + action.title + "</div><div class='ally-item-desc'>" + action.desc + "</div></div>" + keys + "<div class='ally-select'>Select <span class='ally-shortcut'>⏎</span></div></div>");
		} else {
			$("#ally-extension #ally-list").append("<div class='ally-item ally-item-active' " + skip + " data-index='" + index + "' data-type='" + action.type + "'>" + img + "<div class='ally-item-details'><div class='ally-item-name'>" + action.title + "</div><div class='ally-item-desc'>" + action.desc + "</div></div>" + keys + "<div class='ally-select'>Select <span class='ally-shortcut'>⏎</span></div></div>");
		}
		if (!action.emoji) {
			var loadimg = new Image();
			loadimg.src = action.favIconUrl;

			// Favicon doesn't load, use a fallback
			loadimg.onerror = () => {
				$(".ally-item[data-index='" + index + "'] img").attr("src", chrome.runtime.getURL("/assets/globe.svg"));
			}
		}
	}

	// Add actions to the ally
	function populateAlly() {
		$("#ally-extension #ally-list").html("");
		actions.forEach((action, index) => {
			var keys = "";
			if (action.keycheck) {
				keys = "<div class='ally-keys'>";
				action.keys.forEach(function (key) {
					keys += "<span class='ally-shortcut'>" + key + "</span>";
				});
				keys += "</div>";
			}

			// Check if the action has an emoji or a favicon
			if (!action.emoji) {
				var onload = 'if ("naturalHeight" in this) {if (this.naturalHeight + this.naturalWidth === 0) {this.onerror();return;}} else if (this.width + this.height == 0) {this.onerror();return;}';
				var img = "<img src='" + action.favIconUrl + "' alt='favicon' onload='" + onload + "' onerror='this.src=&quot;" + chrome.runtime.getURL("/assets/globe.svg") + "&quot;' class='ally-icon'>";
				renderAction(action, index, keys, img);
			} else {
				var img = "<span class='ally-emoji-action'>" + action.emojiChar + "</span>";
				renderAction(action, index, keys, img);
			}
		})
		$(".ally-extension #ally-results").html(actions.length + " results");
	}

	// Open the ally
	function openAlly() {
		chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
			isOpen = true;
			actions = response.actions;
			$("#ally-extension input").val("");
			populateAlly();
			$("html, body").stop();
			$("#ally-extension").removeClass("ally-closing");
			window.setTimeout(() => {
				$("#ally-extension input").focus();
				focusLock.on($("#ally-extension input").get(0));
				$("#ally-extension input").focus();
			}, 100);
		});
	}

	// Close the ally
	function closeAlly() {
		if (window.location.href == "chrome-extension://mpanekjjajcabgnlbabmopeenljeoggm/newtab.html") {
			chrome.runtime.sendMessage({ request: "restore-new-tab" });
		} else {
			isOpen = false;
			$("#ally-extension").addClass("ally-closing");
		}
	}

	// Hover over an action in the ally
	function hoverItem() {
		$(".ally-item-active").removeClass("ally-item-active");
		$(this).addClass("ally-item-active");
	}

	// Search for an action in the ally
	function handleInput(e) {
		if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 37) {
			return;
		}

		const value = $(this).val().toLowerCase();
		const requestActionIndex = actions.findIndex(x => x.action == "request-action");

		$(".ally-extension #ally-list .ally-item").filter(function (index) {
			const element = $(".ally-item[data-index='" + index + "']");

			if (value.length > 0) {
				if (index === requestActionIndex) element.show();
				else element.hide()
			} else {
				if (index === requestActionIndex) element.hide();
				else element.show()
			}
		})

		$(".ally-extension #ally-results").html($("#ally-extension #ally-list .ally-item:visible").length + " results");
		$(".ally-item-active").removeClass("ally-item-active");
		$(".ally-extension #ally-list .ally-item:visible").first().addClass("ally-item-active");
	}

	// Handle actions from the ally
	function handleAction(e) {
		var action = actions[$(".ally-item-active").attr("data-index")];
		chrome.runtime.sendMessage({ request: action.action, tab: action, query: $(".ally-extension input").val() });
	}

	// Check which keys are down
	var down = [];

	$(document).keydown((e) => {
		down[e.keyCode] = true;
		if (down[38]) {
			// Up key
			if ($(".ally-item-active").prevAll("div").not(":hidden").first().length) {
				var previous = $(".ally-item-active").prevAll("div").not(":hidden").first();
				$(".ally-item-active").removeClass("ally-item-active");
				previous.addClass("ally-item-active");
				previous[0].scrollIntoView({ block: "nearest", inline: "nearest" });
			}
		} else if (down[40]) {
			// Down key
			if ($(".ally-item-active").nextAll("div").not(":hidden").first().length) {
				var next = $(".ally-item-active").nextAll("div").not(":hidden").first();
				$(".ally-item-active").removeClass("ally-item-active");
				next.addClass("ally-item-active");
				next[0].scrollIntoView({ block: "nearest", inline: "nearest" });
			}
		} else if (down[27] && isOpen) {
			// Esc key
			closeAlly();
		} else if (down[13] && isOpen) {
			// Enter key
			handleAction(e);
		}
	}).keyup((e) => {
		if (down[18] && down[16] && down[80]) {
			chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
				actions = response.actions;
				populateAlly();
			});
		} else if (down[18] && down[16] && down[77]) {
			chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
				actions = response.actions;
				populateAlly();
			});
		} else if (down[18] && down[16] && down[67]) {
			window.open("mailto:");
		}

		down = [];
	});

	// Recieve messages from background
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.request == "open-ally") {
			if (isOpen) {
				closeAlly();
			} else {
				openAlly();
			}
		} else if (message.request == "close-ally") {
			closeAlly();
		}
	});

	$(document).on("mouseover", ".ally-extension .ally-item:not(.ally-item-active)", hoverItem);
	$(document).on("keyup", ".ally-extension input", handleInput);
	$(document).on("click", ".ally-item-active", handleAction);
	$(document).on("click", ".ally-extension #ally-overlay", closeAlly);
});
