const Cc = Components.classes;
const Ci = Components.interfaces;

var keyring = {};
Components.utils.import("chrome://gnome-keyring/content/gnome-keyring.js", keyring);

var GnomeKeyringOptions = {
	prefBranch: "extensions.gnome-keyring.",

	// Console logging service, used for debugging.
	__logService : null,
	get _logService() {
		if (!this.__logService)
			this.__logService = Cc["@mozilla.org/consoleservice;1"].
						getService(Ci.nsIConsoleService);
		return this.__logService;
	},
	log: function (message) {
		dump("GnomeKeyringOptions: " + message + "\n");
		this._logService.logStringMessage("GnomeKeyringOptions: " + message);
	},
	init: function() {
		var that = this;
		var keyringType = document.getElementById("keyringType");
		var menu = document.getElementById("keyringNameMenu")
		keyringType.addEventListener("select", function() {
			if (keyringType.value == "choose") {
				menu.setAttribute("disabled", false);
			} else {
				menu.setAttribute("disabled", true);
			}
		});

		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService)
			.getBranch(this.prefBranch);
		var currentKeyring = prefBranch.getCharPref("keyringName");

		if (currentKeyring == "") {
			menu.setAttribute("disabled", true);
			keyringType.value = "default";
		} else if (currentKeyring == "session") {
			menu.setAttribute("disabled", true);
			keyringType.value = "session";
		} else {
			menu.setAttribute("disabled", false);
			keyringType.value = "choose";
		}

		var keyrings = keyring.getNames();
		menu.removeAllItems();
		for (let i=0; i<keyrings.length; ++i) {
			if (keyrings[i] == "session")
				continue;
			menu.insertItemAt(i, keyrings[i], keyrings[i]);
		}

		menu.value = currentKeyring;
		if (menu.selectedIndex == -1)
			menu.selectedIndex = 0;
	},
	save: function() {
		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
					.getService(Ci.nsIPrefService)
					.getBranch(this.prefBranch);
		var menu = document.getElementById("keyringNameMenu");
		var keyringType = document.getElementById("keyringType");
		if (keyringType.value == "default") {
			prefBranch.setCharPref("keyringName", "");
		} else if(keyringType.value == "session") {
			prefBranch.setCharPref("keyringName", "session");
		} else {
			prefBranch.setCharPref("keyringName", menu.value);
		}
	}
}
