const Cc = Components.classes;
const Ci = Components.interfaces;

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
		this.log("init");
		var keyring = {};
		Components.utils.import("chrome://gnome-keyring/content/gnome-keyring.js", keyring);

		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService)
			.getBranch(this.prefBranch);

		var currentKeyring = prefBranch.getCharPref("keyringName")

		var menu = document.getElementById("keyringNameMenu")
		var keyrings = keyring.getNames();
		for (let i=0; i<keyrings.length; ++i) {
			menu.insertItemAt(i, keyrings[i], keyrings[i]);
			
			if (keyrings[i] == currentKeyring)
				menu.selectedIndex = i;
		}
		
		if (menu.selectedIndex == -1)
			menu.selectedIndex = 0;
	},
	save: function() {
		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
					.getService(Ci.nsIPrefService)
					.getBranch(this.prefBranch);
		var menu = document.getElementById("keyringNameMenu");
		prefBranch.setCharPref("keyringName", menu.value);
	}
}
