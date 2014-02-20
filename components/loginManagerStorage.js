const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var keyring = {};
Components.utils.import("chrome://gnome-keyring/content/gnome-keyring.js", keyring);

function GnomeKeyringLoginManagerStorage() {}
GnomeKeyringLoginManagerStorage.prototype = {
	classDescription: "GNOME Keyring nsILoginManagerStorage implementation",
	contractID: "@sebastianwick.net/login-manager/storage/gnomekeyring;1",
	classID: Components.ID("{36defadb-7c73-4019-a77c-53c42bda0957}"),
	QueryInterface: XPCOMUtils.generateQI([Ci.nsILoginManagerStorage]),

	keyringName: "",
	prefBranch: "extensions.gnome-keyring.",
	attributePasswordField: "passwordField",
	attributeHostname: "hostname",
	attributeFormSubmitURL: "formSubmitURL",
	attributeHttpRealm: "httpRealm",
	attributeLoginInfoMagic: "mozLoginInfoMagic",
	attributeDisabledHostMagic: "mozDisabledHostMagic",
	attributeDisabledHostName: "disabledHost",
	attributeUsername: "username",
	attributeUsernameField: "usernameField",
	attributeInfoMagic: "mozLoginInfoMagic",

	uiBusy: false,

	// Console logging service, used for debugging.
	__logService : null,
	get _logService() {
		if (!this.__logService)
			this.__logService = Cc["@mozilla.org/consoleservice;1"].
						getService(Ci.nsIConsoleService);
		return this.__logService;
	},
	log: function (message) {
		dump("GnomeKeyringLoginManagerStorage: " + message + "\n");
		this._logService.logStringMessage("GnomeKeyringLoginManagerStorage: " + message);
	},

	// Logs function name and arguments for debugging
	stub: function(arguments) {
		var args = [];
		for (let i = 0; i < arguments.length; i++)
			args.push(arguments[i])
		this.log("Called " + arguments.callee.name + "(" + args.join(",") + ")");
	},

	init: function init() {
		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
					.getService(Ci.nsIPrefService)
					.getBranch(this.prefBranch);
		prefBranch.QueryInterface(Ci.nsIPrefBranch);

		this.keyringName = prefBranch.getCharPref("keyringName");
		var lms = this;
		prefBranch.addObserver("", {
			observe: function(aSubject, aTopic, aData) {
				if(aData == "keyringName")
					lms.keyringName = prefBranch.getCharPref("keyringName");
			}
		}, false);

		var keyringNames = keyring.getNames();
		if(keyringNames.indexOf(this.keyringName) == -1) {
			try {
				keyring.create(this.keyringName, null);
			} catch(e) {
				log("Exception: " + e + " in " + e.stack);
			}
		}
		try {
			keyring.unlock(this.keyringName, null);
		} catch(e) {
			log("Exception: " + e + " in " + e.stack);
		}
	},
	initWithFile: function initWithFile(aInputFile, aOutputFile) {
	},
	addLogin: function addLogin(login) {
		var attr = {};
		attr[this.attributeHostname] = login.hostname;
		attr[this.attributeFormSubmitURL] = login.formSubmitURL;
		attr[this.attributeHttpRealm] = login.httpRealm;
		attr[this.attributeUsername] = login.username;
		attr[this.attributeUsernameField] = login.usernameField;
		attr[this.attributePasswordField] = login.passwordField;
		attr[this.attributeInfoMagic] = "loginInfoMagicv1";

		keyring.itemCreate(this.keyringName, keyring.Values.ItemType.GENERIC_SECRET,
				   login.hostname, attr, login.password, true);
	},
	removeLogin: function removeLogin(login) {
		var items = keyring.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			if (items[i].attributes[this.attributeHostname] == login.hostname &&
			    items[i].attributes[this.attributeFormSubmitURL] == login.formSubmitURL &&
			    items[i].attributes[this.attributeHttpRealm] == login.httpRealm &&
			    items[i].attributes[this.attributeUsername] == login.username &&
			    items[i].attributes[this.attributeUsernameField] == login.usernameField &&
			    items[i].attributes[this.attributePasswordField] == login.passwordField &&
			    items[i].attributes[this.attributeInfoMagic] == "loginInfoMagicv1")
				keyring.itemDelete(this.keyringName, items[i].id);
		}
	},
	modifyLogin: function modifyLogin(oldLogin, newLogin) {
		// TODO: implement
	},
	getAllLogins: function getAllLogins(count) {
		var logins = this.findLogins(count, null, null, null);
		return logins;
	},
	getAllEncryptedLogins: function getAllEncryptedLogins(count) {
		var logins = this.findLogins(count, null, null, null);
		for(var i in logins)
			logins[i].password = null;
		return logins;
	},
	removeAllLogins: function removeAllLogins() {
		var items = keyring.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			if (items[i].attributes[this.attributeInfoMagic] == "loginInfoMagicv1")
				keyring.itemDelete(this.keyringName, items[i].id);
		}
	},
	getAllDisabledHosts: function getAllDisabledHosts(count) {
		var items = keyring.getItems(this.keyringName);
		var hosts = [];
		for(var i=0; i<items.length; i++) {
			var item = items[i];
			if(item.attributes[this.attributeDisabledHostMagic] ==
			     "disabledHostMagicv1") {
				hosts.push(item.attributes[this.attributeDisabledHostName]);
			}
		}
		count.value = hosts.length;
		return hosts;
	},
	getLoginSavingEnabled: function getLoginSavingEnabled(hostname) {
		var items = keyring.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			var item = items[i];
			if(item.attributes[this.attributeDisabledHostMagic] ==
			     "disabledHostMagicv1" &&
			   item.attributes[this.attributeDisabledHostName] ==
			     hostname) {
				return false;
			}
		}
		return true;
	},
	setLoginSavingEnabled: function setLoginSavingEnabled(hostname, enabled) {
		var isEnabled = this.getLoginSavingEnabled(hostname);
		if(!enabled && isEnabled) {
			var attr = {};
			attr[this.attributeDisabledHostName] = hostname;
			attr[this.attributeDisabledHostMagic] = "disabledHostMagicv1";

			keyring.itemCreate(this.keyringName, keyring.Values.ItemType.NOTE,
					"Mozilla disabled host (" + hostname + ")",
					attr, "", true);
		}
		else if(enabled && !isEnabled) {
			var items = keyring.getItems(this.keyringName);
			for(var i=0; i<items.length; i++) {
				var item = items[i];
				if(item.attributes[this.attributeDisabledHostMagic] ==
				     "disabledHostMagicv1" &&
				   item.attributes[this.attributeDisabledHostName] ==
				     hostname) {
					keyring.itemDelete(this.keyringName, item.id);
				}
			}
		}
	},
	findLogins: function findLogins(count, hostname, formSubmitURL, httpRealm) {
		var items = keyring.getItems(this.keyringName);
		var logins = [];
		for(var i=0; i<items.length; i++) {
			var item = items[i];
			if(this.itemMatchesLogin(item, hostname, formSubmitURL, httpRealm)) {
				var login = Components.classes["@mozilla.org/login-manager/loginInfo;1"]
						.createInstance(Components.interfaces.nsILoginInfo);
				login.init(item.attributes[this.attributeHostname],
					   item.attributes[this.attributeFormSubmitURL],
					   item.attributes[this.attributeHttpRealm],
					   item.attributes[this.attributeUsername],
					   item.secret,
					   item.attributes[this.attributeUsernameField],
					   item.attributes[this.attributePasswordField]);
				logins.push(login);
			}
		}
		count.value = logins.length;
		return logins;
	},
	countLogins: function countLogins(aHostname, aFormSubmitURL, aHttpRealm) {
		var items = keyring.getItems(this.keyringName);
		var count = 0;

		for(var i=0; i<items.length; i++) {
			if(this.itemMatchesLogin(items[i], aHostname, aFormSubmitURL, aHttpRealm))
				count++;
		}
		return count;
	},
	itemMatchesLogin: function(item, aHostname, aFormSubmitURL, aHttpRealm) {
		return  (item.attributes[this.attributeInfoMagic] == "loginInfoMagicv1") &&
			(typeof aHostname != "string" || aHostname == "" || item.attributes[this.attributeHostname] == aHostname) &&
			(typeof aFormSubmitURL != "string" || aFormSubmitURL == "" || item.attributes[this.attributeFormSubmitURL] == aFormSubmitURL) &&
			(typeof aHttpRealm != "string" || aHttpRealm == "" || item.attributes[this.attributeHttpRealm] == aHttpRealm);
	}
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([GnomeKeyringLoginManagerStorage]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([GnomeKeyringLoginManagerStorage]);
