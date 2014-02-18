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
	attributeUsername: "username",
	attributeUsernameField: "usernameField",
	attributeInfoMagic: "mozLoginInfoMagic",

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

	init: function SLMS_init() {
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
	
		this.stub(arguments);
	},
	initWithFile: function SLMS_initWithFile(aInputFile, aOutputFile) {
		this.stub(arguments);
	},
	addLogin: function SLMS_addLogin(login) {
		this.stub(arguments);
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
	removeLogin: function SLMS_removeLogin(login) {
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
	modifyLogin: function SLMS_modifyLogin(oldLogin, newLogin) {
		this.stub(arguments);
	},
	getAllLogins: function SLMS_getAllLogins(count) {
		this.stub(arguments);
		return this.findLogins(count, null, null, null);
	},
	removeAllLogins: function SLMS_removeAllLogins() {
		this.stub(arguments);
		var items = keyring.getItems(this.keyringName);
		for(var i=0; i<items.length; i++) {
			if (items[i].attributes[this.attributeInfoMagic] == "loginInfoMagicv1")
				keyring.itemDelete(this.keyringName, items[i].id);
		}
	},
	getAllDisabledHosts: function SLMS_getAllDisabledHosts(count) {
		this.stub(arguments);
	},
	getLoginSavingEnabled: function SLMS_getLoginSavingEnabled(hostname) {
		this.stub(arguments);
		return true;
	},
	setLoginSavingEnabled: function SLMS_setLoginSavingEnabled(hostname, enabled) {
		this.stub(arguments);
	},
	findLogins: function SLMS_findLogins(count, hostname, formSubmitURL, httpRealm) {
		this.stub(arguments);
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
	countLogins: function SLMS_countLogins(aHostname, aFormSubmitURL, aHttpRealm) {
		this.stub(arguments);
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
			(typeof aFormSubmitURL != "string" || aFormSubmitURL == "" || item.attributes[this.attributeFormSubmitURL] == aFormSubmitURL);
			(typeof aHttpRealm != "string" || aHttpRealm == "" || item.attributes[this.attributeHttpRealm] == aHttpRealm);
	}
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([GnomeKeyringLoginManagerStorage]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([GnomeKeyringLoginManagerStorage]);
