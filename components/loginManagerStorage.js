const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Promise.jsm");

var keyring = {};
Components.utils.import("chrome://gnome-keyring/content/gnome-keyring.js", keyring);

function GnomeKeyringLoginManagerStorage() {}
GnomeKeyringLoginManagerStorage.prototype = {
	classDescription: "GNOME Keyring nsILoginManagerStorage implementation",
	contractID: "@sebastianwick.net/login-manager/storage/gnomekeyring;1",
	classID: Components.ID("{36defadb-7c73-4019-a77c-53c42bda0957}"),
	QueryInterface: XPCOMUtils.generateQI([Ci.nsILoginManagerStorage]),

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
	keyringUpdated: true,
	cachedItems: [],

	get uiBusy() {
		return false;
	},

	get isLoggedIn() {
		return true;
	},

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

	stub: function() {
	},

	get keyringName() {
		return this._keyringName;
	},
	set keyringName(name) {
		this._keyringName = name.length == 0 ? null : name;
		this.keyringUpdated = true;
	},

	init: function() {
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
	},
	initialize: function() {
		this.init();
		return new Promise(function (resolve) { resolve(); });
	},
	initWithFile: function(aInputFile, aOutputFile) {
		this.init();
	},
	terminate: function() {
		return new Promise(function (resolve) { resolve(); });
	},
	addLogin: function(login) {
		this.tryUnlockKeyring();

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
		this.keyringUpdated = true;
	},
	removeLogin: function(login) {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			if (items[i].attributes[this.attributeHostname] == login.hostname &&
			    items[i].attributes[this.attributeFormSubmitURL] == login.formSubmitURL &&
			    (login.httpRealm == null || items[i].attributes[this.attributeHttpRealm] == login.httpRealm) &&
			    items[i].attributes[this.attributeUsername] == login.username &&
			    items[i].attributes[this.attributeUsernameField] == login.usernameField &&
			    items[i].attributes[this.attributePasswordField] == login.passwordField &&
			    items[i].attributes[this.attributeInfoMagic] == "loginInfoMagicv1")
				keyring.itemDelete(this.keyringName, items[i].id);
		}

		this.keyringUpdated = true;
	},
	modifyLogin: function(oldLogin, newLoginData) {
		this.tryUnlockKeyring();

		var newLogin = null;
		try {
			newLoginData = newLoginData.QueryInterface(Ci.nsIPropertyBag);
			newLogin = oldLogin.clone();
			let propEnum = newLoginData.enumerator;
			while (propEnum.hasMoreElements()) {
				let prop = propEnum.getNext().QueryInterface(Ci.nsIProperty);
				switch (prop.name) {
				case "hostname":
				case "httpRealm":
				case "formSubmitURL":
				case "username":
				case "password":
				case "usernameField":
				case "passwordField":
					newLogin[prop.name] = prop.value;
					break;
				default:
					break;
				}
			}
		} catch (e) {
			newLogin = newLoginData.QueryInterface(Ci.nsILoginInfo);
		}
		this.removeLogin(oldLogin);
		this.addLogin(newLogin);

		this.keyringUpdated = true;
	},
	getAllLogins: function(count) {
		var logins = this.findLogins(count, null, null, null);
		return logins;
	},
	getAllEncryptedLogins: function(count) {
		var logins = this.findLogins(count, null, null, null);
		for(var i in logins)
			logins[i].password = null;
		return logins;
	},
	removeAllLogins: function() {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			if (items[i].attributes[this.attributeInfoMagic] == "loginInfoMagicv1")
				keyring.itemDelete(this.keyringName, items[i].id);
		}

		this.keyringUpdated = true;
	},
	getAllDisabledHosts: function(count) {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
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
	getLoginSavingEnabled: function(hostname) {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
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
	setLoginSavingEnabled: function(hostname, enabled) {
		// getLoginSavingEnabled calls tryUnlockKeyring().
		var isEnabled = this.getLoginSavingEnabled(hostname);
		if(!enabled && isEnabled) {
			var attr = {};
			attr[this.attributeDisabledHostName] = hostname;
			attr[this.attributeDisabledHostMagic] = "disabledHostMagicv1";

			keyring.itemCreate(this.keyringName, keyring.Values.ItemType.NOTE,
					"Mozilla disabled host (" + hostname + ")",
					attr, "", true);
			this.keyringUpdated = true;
		}
		else if(enabled && !isEnabled) {
			var items = this.getItems(this.keyringName);
			for(var i=0; i<items.length; i++) {
				var item = items[i];
				if(item.attributes[this.attributeDisabledHostMagic] ==
				     "disabledHostMagicv1" &&
				   item.attributes[this.attributeDisabledHostName] ==
				     hostname) {
					keyring.itemDelete(this.keyringName, item.id);
					this.keyringUpdated = true;
				}
			}
		}
	},
	findLogins: function(count, hostname, formSubmitURL, httpRealm) {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
		var logins = [];
		for(var i=0; i<items.length; i++) {
			var item = items[i];
			if(this.itemMatchesLogin(item, hostname, formSubmitURL, httpRealm)) {
				var login = Cc["@mozilla.org/login-manager/loginInfo;1"]
						.createInstance(Ci.nsILoginInfo);
				login.init(item.attributes[this.attributeHostname],
					   item.attributes[this.attributeFormSubmitURL],
					   /* The HttpRealm must be either a non empty string or null */
					   item.attributes[this.attributeHttpRealm] == "" ? null : item.attributes[this.attributeHttpRealm],
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
	countLogins: function(aHostname, aFormSubmitURL, aHttpRealm) {
		this.tryUnlockKeyring();

		var items = this.getItems(this.keyringName);
		var count = 0;

		for(var i=0; i<items.length; i++) {
			if(this.itemMatchesLogin(items[i], aHostname, aFormSubmitURL, aHttpRealm))
				count++;
		}
		return count;
	},
	searchLogins: function(count, matchData) {
		/*
		we should handle all of those, but we can't because we don't have
		enough data in the keyring; so just handle what we got

		"formSubmitURL"
		"hostname"
		"httpRealm"
		"id"
		"usernameField"
		"passwordField"
		"encryptedUsername"
		"encryptedPassword"
		"guid"
		"encType"
		"timeCreated"
		"timeLastUsed"
		"timePasswordChanged"
		"timesUsed"
		*/

		this.tryUnlockKeyring();

		let that = this;
		let itemMatches = function(i, f) {
			return (
			(f[that.attributeFormSubmitURL] == undefined ||
			i.attributes[that.attributeFormSubmitURL] == f[that.attributeFormSubmitURL])
			&&
			(f[that.attributeHostname] == undefined ||
			i.attributes[that.attributeHostname] == f[that.attributeHostname])
			&&
			(f[that.attributeHttpRealm] == undefined ||
			i.attributes[that.attributeHttpRealm] == f[that.attributeHttpRealm])
			&&
			(f[that.attributeUsernameField] == undefined ||
			i.attributes[that.attributeUsernameField] == f[that.attributeUsernameField])
			&&
			(f[that.attributePasswordField] == undefined ||
			i.attributes[that.attributePasswordField] == f[that.attributePasswordField])
			);
		};

		let fields = {};
		let propEnum = matchData.enumerator;
		while (propEnum.hasMoreElements()) {
			let prop = propEnum.getNext().QueryInterface(Ci.nsIProperty);
			fields[prop.name] = prop.value;
		}

		let items = this.getItems(this.keyringName);
		let logins = [];
		for(var i=0; i<items.length; i++) {
			let item = items[i];
			if(itemMatches(item, fields)) {
				var login = Cc["@mozilla.org/login-manager/loginInfo;1"]
						.createInstance(Ci.nsILoginInfo);
				login.init(item.attributes[this.attributeHostname],
					   item.attributes[this.attributeFormSubmitURL],
					   /* The HttpRealm must be either a non empty string or null */
					   item.attributes[this.attributeHttpRealm] == "" ? null : item.attributes[this.attributeHttpRealm],
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
	itemMatchesLogin: function(item, aHostname, aFormSubmitURL, aHttpRealm) {
		return  (item.attributes[this.attributeInfoMagic] == "loginInfoMagicv1") &&
			(typeof aHostname != "string" || aHostname == "" || item.attributes[this.attributeHostname] == aHostname) &&
			(typeof aFormSubmitURL != "string" || aFormSubmitURL == "" || item.attributes[this.attributeFormSubmitURL] == aFormSubmitURL) &&
			(typeof aHttpRealm != "string" || aHttpRealm == "" || item.attributes[this.attributeHttpRealm] == aHttpRealm);
	},
	tryUnlockKeyring: function() {
		if (!keyring.isLocked(this.keyringName)) {
			return;
		}

		try {
			keyring.unlock(this.keyringName, null);
		} catch (e) {
			this.log("Exception: " + e + " in " + e.stack);
		}
	},
	getItems: function(keyringName) {
		if (this.keyringUpdated) {
			this.cachedItems = keyring.getItems(this.keyringName);
			this.keyringUpdated = false;
		}
		return this.cachedItems;
	}
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([GnomeKeyringLoginManagerStorage]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([GnomeKeyringLoginManagerStorage]);
