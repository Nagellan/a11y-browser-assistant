// Workaround to capture Esc key on certain sites
var isOpen = false;
document.onkeyup = (e) => {
	if (e.key == "Escape" && isOpen) {
		chrome.runtime.sendMessage({ request: "close-ally" })
	}
}

$(document).ready(() => {
	var actions = [];
	var isFiltered = false;

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
		if (action.action == "search" || action.action == "goto") {
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

	// Add filtered actions to the ally
	function populateAllyFilter(actions) {
		isFiltered = true;
		$("#ally-extension #ally-list").html("");
		const renderRow = (index) => {
			const action = actions[index]
			var keys = "";
			if (action.keycheck) {
				keys = "<div class='ally-keys'>";
				action.keys.forEach(function (key) {
					keys += "<span class='ally-shortcut'>" + key + "</span>";
				});
				keys += "</div>";
			}
			var img = "<img src='" + action.favIconUrl + "' alt='favicon' onerror='this.src=&quot;" + chrome.runtime.getURL("/assets/globe.svg") + "&quot;' class='ally-icon'>";
			if (action.emoji) {
				img = "<span class='ally-emoji-action'>" + action.emojiChar + "</span>"
			}
			if (index != 0) {
				return $("<div class='ally-item' data-index='" + index + "' data-type='" + action.type + "' data-url='" + action.url + "'>" + img + "<div class='ally-item-details'><div class='ally-item-name'>" + action.title + "</div><div class='ally-item-desc'>" + action.url + "</div></div>" + keys + "<div class='ally-select'>Select <span class='ally-shortcut'>⏎</span></div></div>")[0]
			} else {
				return $("<div class='ally-item ally-item-active' data-index='" + index + "' data-type='" + action.type + "' data-url='" + action.url + "'>" + img + "<div class='ally-item-details'><div class='ally-item-name'>" + action.title + "</div><div class='ally-item-desc'>" + action.url + "</div></div>" + keys + "<div class='ally-select'>Select <span class='ally-shortcut'>⏎</span></div></div>")[0]
			}
		}
		actions.length && new VirtualizedList.default($("#ally-extension #ally-list")[0], {
			height: 400,
			rowHeight: 60,
			rowCount: actions.length,
			renderRow,
			onMount: () => $(".ally-extension #ally-results").html(actions.length + " results"),
		});
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

	// Show a toast when an action has been performed
	function showToast(action) {
		$("#ally-extension-toast span").html('"' + action.title + '" has been successfully performed');
		$("#ally-extension-toast").addClass("ally-show-toast");
		setTimeout(() => {
			$(".ally-show-toast").removeClass("ally-show-toast");
		}, 3000)
	}

	// Autocomplete commands. Since they all start with different letters, it can be the default behavior
	function checkShortHand(e, value) {
		var el = $(".ally-extension input");
		if (e.keyCode != 8) {
			if (value == "/t") {
				el.val("/tabs ")
			} else if (value == "/b") {
				el.val("/bookmarks ")
			} else if (value == "/h") {
				el.val("/history ");
			} else if (value == "/r") {
				el.val("/remove ");
			} else if (value == "/a") {
				el.val("/actions ");
			}
		} else {
			if (value == "/tabs" || value == "/bookmarks" || value == "/actions" || value == "/remove" || value == "/history") {
				el.val("");
			}
		}
	}

	// Add protocol
	function addhttp(url) {
		if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
			url = "http://" + url;
		}
		return url;
	}

	// Check if valid url
	function validURL(str) {
		var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
			'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
			'((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
			'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
			'(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
			'(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
		return !!pattern.test(str);
	}

	// Search for an action in the ally
	function search(e) {
		if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 37) {
			return;
		}
		var value = $(this).val().toLowerCase();
		checkShortHand(e, value);
		value = $(this).val().toLowerCase();
		if (value.startsWith("/history")) {
			$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
			$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
			var tempvalue = value.replace("/history ", "");
			var query = "";
			if (tempvalue != "/history") {
				query = value.replace("/history ", "");
			}
			chrome.runtime.sendMessage({ request: "search-history", query: query }, (response) => {
				populateAllyFilter(response.history);
			});
		} else if (value.startsWith("/bookmarks")) {
			$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
			$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
			var tempvalue = value.replace("/bookmarks ", "");
			if (tempvalue != "/bookmarks" && tempvalue != "") {
				var query = value.replace("/bookmarks ", "");
				chrome.runtime.sendMessage({ request: "search-bookmarks", query: query }, (response) => {
					populateAllyFilter(response.bookmarks);
				});
			} else {
				populateAllyFilter(actions.filter(x => x.type == "bookmark"));
			}
		} else {
			if (isFiltered) {
				populateAlly();
				isFiltered = false;
			}
			$(".ally-extension #ally-list .ally-item").filter(function () {
				if (value.startsWith("/tabs")) {
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
					var tempvalue = value.replace("/tabs ", "");
					if (tempvalue == "/tabs") {
						$(this).toggle($(this).attr("data-type") == "tab");
					} else {
						tempvalue = value.replace("/tabs ", "");
						$(this).toggle(($(this).find(".ally-item-name").text().toLowerCase().indexOf(tempvalue) > -1 || $(this).find(".ally-item-desc").text().toLowerCase().indexOf(tempvalue) > -1) && $(this).attr("data-type") == "tab");
					}
				} else if (value.startsWith("/remove")) {
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
					var tempvalue = value.replace("/remove ", "")
					if (tempvalue == "/remove") {
						$(this).toggle($(this).attr("data-type") == "bookmark" || $(this).attr("data-type") == "tab");
					} else {
						tempvalue = value.replace("/remove ", "");
						$(this).toggle(($(this).find(".ally-item-name").text().toLowerCase().indexOf(tempvalue) > -1 || $(this).find(".ally-item-desc").text().toLowerCase().indexOf(tempvalue) > -1) && ($(this).attr("data-type") == "bookmark" || $(this).attr("data-type") == "tab"));
					}
				} else if (value.startsWith("/actions")) {
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
					$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
					var tempvalue = value.replace("/actions ", "")
					if (tempvalue == "/actions") {
						$(this).toggle($(this).attr("data-type") == "action");
					} else {
						tempvalue = value.replace("/actions ", "");
						$(this).toggle(($(this).find(".ally-item-name").text().toLowerCase().indexOf(tempvalue) > -1 || $(this).find(".ally-item-desc").text().toLowerCase().indexOf(tempvalue) > -1) && $(this).attr("data-type") == "action");
					}
				} else {
					$(this).toggle($(this).find(".ally-item-name").text().toLowerCase().indexOf(value) > -1 || $(this).find(".ally-item-desc").text().toLowerCase().indexOf(value) > -1);
					if (value == "") {
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
					} else if (!validURL(value)) {
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").show();
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").hide();
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "'] .ally-item-name").html('\"' + value + '\"');
					} else {
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "search") + "']").hide();
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "']").show();
						$(".ally-item[data-index='" + actions.findIndex(x => x.action == "goto") + "'] .ally-item-name").html(value);
					}
				}
			});
		}

		$(".ally-extension #ally-results").html($("#ally-extension #ally-list .ally-item:visible").length + " results");
		$(".ally-item-active").removeClass("ally-item-active");
		$(".ally-extension #ally-list .ally-item:visible").first().addClass("ally-item-active");
	}

	// Handle actions from the ally
	function handleAction(e) {
		var action = actions[$(".ally-item-active").attr("data-index")];
		closeAlly();
		if ($(".ally-extension input").val().toLowerCase().startsWith("/remove")) {
			chrome.runtime.sendMessage({ request: "remove", type: action.type, action: action });
		} else if ($(".ally-extension input").val().toLowerCase().startsWith("/history")) {
			if (e.ctrlKey || e.metaKey) {
				window.open($(".ally-item-active").attr("data-url"));
			} else {
				window.open($(".ally-item-active").attr("data-url"), "_self");
			}
		} else if ($(".ally-extension input").val().toLowerCase().startsWith("/bookmarks")) {
			if (e.ctrlKey || e.metaKey) {
				window.open($(".ally-item-active").attr("data-url"));
			} else {
				window.open($(".ally-item-active").attr("data-url"), "_self");
			}
		} else {
			chrome.runtime.sendMessage({ request: action.action, tab: action, query: $(".ally-extension input").val() });
			switch (action.action) {
				case "bookmark":
					if (e.ctrlKey || e.metaKey) {
						window.open(action.url);
					} else {
						window.open(action.url, "_self");
					}
					break;
				case "scroll-bottom":
					window.scrollTo(0, document.body.scrollHeight);
					showToast(action);
					break;
				case "scroll-top":
					window.scrollTo(0, 0);
					break;
				case "navigation":
					if (e.ctrlKey || e.metaKey) {
						window.open(action.url);
					} else {
						window.open(action.url, "_self");
					}
					break;
				case "fullscreen":
					var elem = document.documentElement;
					elem.requestFullscreen();
					break;
				case "new-tab":
					window.open("");
					break;
				case "email":
					window.open("mailto:");
					break;
				case "url":
					if (e.ctrlKey || e.metaKey) {
						window.open(action.url);
					} else {
						window.open(action.url, "_self");
					}
					break;
				case "goto":
					if (e.ctrlKey || e.metaKey) {
						window.open(addhttp($(".ally-extension input").val()));
					} else {
						window.open(addhttp($(".ally-extension input").val()), "_self");
					}
					break;
				case "print":
					window.print();
					break;
				case "remove-all":
				case "remove-history":
				case "remove-cookies":
				case "remove-cache":
				case "remove-local-storage":
				case "remove-passwords":
					showToast(action);
					break;
			}
		}

		// Fetch actions again
		chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
			actions = response.actions;
			populateAlly();
		});
	}

	// Customize the shortcut to open the Ally box
	function openShortcuts() {
		chrome.runtime.sendMessage({ request: "extensions/shortcuts" });
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
			if (actions.find(x => x.action == "pin") != undefined) {
				chrome.runtime.sendMessage({ request: "pin-tab" });
			} else {
				chrome.runtime.sendMessage({ request: "unpin-tab" });
			}
			chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
				actions = response.actions;
				populateAlly();
			});
		} else if (down[18] && down[16] && down[77]) {
			if (actions.find(x => x.action == "mute") != undefined) {
				chrome.runtime.sendMessage({ request: "mute-tab" });
			} else {
				chrome.runtime.sendMessage({ request: "unmute-tab" });
			}
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

	$(document).on("click", "#open-page-ally-extension-thing", openShortcuts);
	$(document).on("mouseover", ".ally-extension .ally-item:not(.ally-item-active)", hoverItem);
	$(document).on("keyup", ".ally-extension input", search);
	$(document).on("click", ".ally-item-active", handleAction);
	$(document).on("click", ".ally-extension #ally-overlay", closeAlly);
});
