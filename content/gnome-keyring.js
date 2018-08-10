Components.utils.import("resource://gre/modules/ctypes.jsm");

var EXPORTED_SYMBOLS = [ "Values", "itemGetAttributes", "itemGetInfo",
	"itemDelete",  "itemCreate", "getItems", "getItemIDs", "getNames",
	"changePassword", "lock", "unlock", "isLocked", "destroy", "create",
	"printItem" ];

var Values = {
	Result: {
		OK: 0,
		DENIED: 1,
		NO_KEYRING_DAEMON: 2,
		ALREADY_UNLOCKED: 3,
		NO_SUCH_KEYRING: 4,
		BAD_ARGUMENTS: 5,
		IO_ERROR: 6,
		CANCELLED: 7,
		KEYRING_ALREADY_EXISTS: 8,
		NO_MATCH: 9
	},
	ItemType: {
		GENERIC_SECRET: 0,
		NETWORK_PASSWORD: 1,
		NOTE: 2,
		CHAINED_KEYRING_PASSWORD: 3,
		ENCRYPTION_KEY_PASSWORD: 4,
		PK_STORAGE: 0x100
	},
	AttributeType: {
		STRING: 0,
		UINT32: 1
	}
};

var Type = (function() {
	/* basic types */
	var char = ctypes.char;
	var gchar = ctypes.char;
	var guint32 = ctypes.uint32_t;
	var guint = ctypes.unsigned_int;
	var gboolean = ctypes.bool;
	var gpointer = ctypes.voidptr_t;

	/* enums */
	var GnomeKeyringResult = ctypes.int;
	var GnomeKeyringItemType = ctypes.int;
	var GnomeKeyringAttributeType = ctypes.int;

	/* opaque structs */
	var GnomeKeyringInfo = ctypes.voidptr_t;
	var GnomeKeyringItemInfo = ctypes.voidptr_t;

	/* structs */
	/**
	 * struct GList {
	 *   gpointer data;
	 *   GList *next;
	 *   GList *prev;
	 * };
	 */
	var GList = new ctypes.StructType("GList", [
		{ "data": gpointer },
		{ "next": gpointer }, /* we can't reference GList here */
		{ "prev": gpointer }  /* same */
	]);
	/**
	 * struct GArray {
	 *   gchar *data;
	 *   guint len;
	 * };
	 */
	var GArray = new ctypes.StructType("GList", [
		{ "data": gchar.ptr },
		{ "len": guint }
	]);
	var GnomeKeyringAttributeList = GArray;
	/**
	 * struct GnomeKeyringAttribute {
	 *   char *name;
	 *   GnomeKeyringAttributeType type;
	 *   union {
	 *     char *string;
	 *     guint32 integer;
	 *   } value;
	 * };
	 */
	var GnomeKeyringAttribute = new ctypes.StructType("GList", [
		{ "name": char.ptr },
		{ "type": GnomeKeyringAttributeType },
		/* we can't have a union, so we choose the biggest type
		 * (char *) and cast to guint32 if the type is UINT32 */
		{ "value": char.ptr }
	]);

	return {
		char: char,
		gchar: gchar,
		guint32: guint32,
		guint: guint,
		gboolean: gboolean,
		gpointer: gpointer,
		GnomeKeyringResult: GnomeKeyringResult,
		GnomeKeyringItemType: GnomeKeyringItemType,
		GnomeKeyringAttributeType: GnomeKeyringAttributeType,
		GnomeKeyringInfo: GnomeKeyringInfo,
		GnomeKeyringItemInfo: GnomeKeyringItemInfo,
		GList: GList,
		GArray: GArray,
		GnomeKeyringAttributeList: GnomeKeyringAttributeList,
		GnomeKeyringAttribute: GnomeKeyringAttribute
	};
})();

var gnomeKeyringLib = ctypes.open("libgnome-keyring.so.0");

/**
 * GnomeKeyringResult gnome_keyring_create_sync (const char *keyring_name,
 *                                               const char *password);
 */
var gnome_keyring_create_sync = gnomeKeyringLib.declare("gnome_keyring_create_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring_name */
	Type.char.ptr /* password (null for user prompt) */);

/**
 * GnomeKeyringResult gnome_keyring_delete_sync (const char *keyring);
 */
var gnome_keyring_delete_sync = gnomeKeyringLib.declare("gnome_keyring_delete_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr /* keyring */);

/**
 * GnomeKeyringResult gnome_keyring_unlock_sync (const char *keyring,
 *                                               const char *password);
 */
var gnome_keyring_unlock_sync = gnomeKeyringLib.declare("gnome_keyring_unlock_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.char.ptr /* password */);

/**
 * GnomeKeyringResult gnome_keyring_lock_sync (const char *keyring);
 */
var gnome_keyring_lock_sync = gnomeKeyringLib.declare("gnome_keyring_lock_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr /* keyring */);

/**
 * GnomeKeyringResult gnome_keyring_change_password_sync (const char *keyring,
 *                                                        const char *original,
 *                                                        const char *password);
 */
var gnome_keyring_change_password_sync = gnomeKeyringLib.declare("gnome_keyring_change_password_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.char.ptr, /* original */
	Type.char.ptr /* password */);

/**
 * GnomeKeyringResult  gnome_keyring_list_keyring_names_sync (GList **keyrings);
 */
var gnome_keyring_list_keyring_names_sync = gnomeKeyringLib.declare("gnome_keyring_list_keyring_names_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.GList.ptr.ptr /* keyrings */);

/**
 * GnomeKeyringAttributeList * gnome_keyring_attribute_list_new (void);
 */
var gnome_keyring_attribute_list_new = gnomeKeyringLib.declare("gnome_keyring_attribute_list_new",
	ctypes.default_abi,
	Type.GnomeKeyringAttributeList.ptr /* return */);

/**
 * void gnome_keyring_attribute_list_free (GnomeKeyringAttributeList *attributes);
 */
var gnome_keyring_attribute_list_free = gnomeKeyringLib.declare("gnome_keyring_attribute_list_free",
	ctypes.default_abi,
	ctypes.void_t, /* return */
	Type.GnomeKeyringAttributeList.ptr /* attributes */);

/**
 * void gnome_keyring_attribute_list_append_string (GnomeKeyringAttributeList *attributes,
 *                                                  const char *name,
 *                                                  const char *value);
 */
var gnome_keyring_attribute_list_append_string = gnomeKeyringLib.declare("gnome_keyring_attribute_list_append_string",
	ctypes.default_abi,
	ctypes.void_t, /* return */
	Type.GnomeKeyringAttributeList.ptr, /* attributes */
	Type.char.ptr, /* name */
	Type.char.ptr /* value */);

/**
 * void gnome_keyring_attribute_list_append_uint32 (GnomeKeyringAttributeList *attributes,
 *                                                  const char *name,
 *                                                  guint32 value);
 */
var gnome_keyring_attribute_list_append_uint32 = gnomeKeyringLib.declare("gnome_keyring_attribute_list_append_uint32",
	ctypes.default_abi,
	ctypes.void_t, /* return */
	Type.GnomeKeyringAttributeList.ptr, /* attributes */
	Type.char.ptr, /* name */
	Type.guint32 /* value */);

/**
 * GnomeKeyringResult gnome_keyring_find_items_sync (GnomeKeyringItemType type,
 *                                                   GnomeKeyringAttributeList *attributes,
 *                                                   GList **found);
 */
var gnome_keyring_find_items_sync = gnomeKeyringLib.declare("gnome_keyring_find_items_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.GnomeKeyringItemType, /* type*/
	Type.GnomeKeyringAttributeList.ptr, /* attributes */
	Type.GList.ptr.ptr /* found */);

/**
 * GnomeKeyringResult gnome_keyring_get_info_sync (const char *keyring,
 *                                                 GnomeKeyringInfo **info);
 */
var gnome_keyring_get_info_sync = gnomeKeyringLib.declare("gnome_keyring_get_info_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.GnomeKeyringInfo.ptr /* info */);

/**
 * gboolean gnome_keyring_info_get_is_locked (GnomeKeyringInfo *keyring_info);
 */
var gnome_keyring_info_get_is_locked = gnomeKeyringLib.declare("gnome_keyring_info_get_is_locked",
	ctypes.default_abi,
	Type.gboolean, /* return */
	Type.GnomeKeyringInfo /* keyring_info */);

/**
 * GnomeKeyringResult gnome_keyring_item_create_sync (const char *keyring,
 *                                                    GnomeKeyringItemType type,
 *                                                    const char *display_name,
 *                                                    GnomeKeyringAttributeList *attributes,
 *                                                    const char *secret,
 *                                                    gboolean update_if_exists,
 *                                                    guint32 *item_id);
 */
var gnome_keyring_item_create_sync = gnomeKeyringLib.declare("gnome_keyring_item_create_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.GnomeKeyringItemType, /* type*/
	Type.char.ptr, /* display_name */
	Type.GnomeKeyringAttributeList.ptr, /* attributes */
	Type.char.ptr, /* secret */
	Type.gboolean, /* update_if_exists */
	Type.guint32.ptr /* item_id */);

/**
 * GnomeKeyringResult gnome_keyring_item_delete_sync (const char *keyring,
 *                                                    guint32 id);
 */
var gnome_keyring_item_delete_sync = gnomeKeyringLib.declare("gnome_keyring_item_delete_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.guint32 /* id */);

/**
 * GnomeKeyringResult gnome_keyring_list_item_ids_sync (const char *keyring,
 *                                                      GList **ids);
 */
var gnome_keyring_list_item_ids_sync = gnomeKeyringLib.declare("gnome_keyring_list_item_ids_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.GList.ptr.ptr /* ids*/);

/**
 * GnomeKeyringResult gnome_keyring_item_get_info_sync (const char *keyring,
 *                                                      guint32 id,
 *                                                      GnomeKeyringItemInfo **info);
 */
var gnome_keyring_item_get_info_sync = gnomeKeyringLib.declare("gnome_keyring_item_get_info_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.guint32, /* id */
	Type.GnomeKeyringItemInfo.ptr /* info */);

/**
 * GnomeKeyringItemType gnome_keyring_item_info_get_type (GnomeKeyringItemInfo *item_info);
 */
var gnome_keyring_item_info_get_type = gnomeKeyringLib.declare("gnome_keyring_item_info_get_type",
	ctypes.default_abi,
	Type.GnomeKeyringItemType, /* return */
	Type.GnomeKeyringItemInfo /* item_info */);

/**
 * char * gnome_keyring_item_info_get_secret (GnomeKeyringItemInfo *item_info);
 */
var gnome_keyring_item_info_get_secret = gnomeKeyringLib.declare("gnome_keyring_item_info_get_secret",
	ctypes.default_abi,
	Type.char.ptr, /* return */
	Type.GnomeKeyringItemInfo /* item_info */);

/**
 * char * gnome_keyring_item_info_get_display_name (GnomeKeyringItemInfo *item_info);
 */
var gnome_keyring_item_info_get_display_name = gnomeKeyringLib.declare("gnome_keyring_item_info_get_display_name",
	ctypes.default_abi,
	Type.char.ptr, /* return */
	Type.GnomeKeyringItemInfo /* item_info */);

/**
 * GnomeKeyringResult gnome_keyring_item_get_attributes_sync
 *                                      (const char *keyring,
 *                                      guint32 id,
 *                                      GnomeKeyringAttributeList **attributes);
 */
var gnome_keyring_item_get_attributes_sync = gnomeKeyringLib.declare("gnome_keyring_item_get_attributes_sync",
	ctypes.default_abi,
	Type.GnomeKeyringResult, /* return */
	Type.char.ptr, /* keyring */
	Type.guint32, /* id */
	Type.GnomeKeyringAttributeList.ptr.ptr /* attributes */);

/**
 * const gchar * gnome_keyring_attribute_get_string (GnomeKeyringAttribute *attribute);
 */
var gnome_keyring_attribute_get_string = gnomeKeyringLib.declare("gnome_keyring_attribute_get_string",
	ctypes.default_abi,
	Type.char.ptr, /* return */
	Type.GnomeKeyringAttribute.ptr /* attribute*/);

/**
 * guint32 gnome_keyring_attribute_get_uint32 (GnomeKeyringAttribute *attribute);
 */
var gnome_keyring_attribute_get_uint32 = gnomeKeyringLib.declare("gnome_keyring_attribute_get_uint32",
	ctypes.default_abi,
	Type.guint32, /* return */
	Type.GnomeKeyringAttribute.ptr /* attribute*/);


var create = function(keyring, password) {
	if(typeof password != "string")
		password = null;
	var error = gnome_keyring_create_sync(keyring, password);
	if(error != Values.Result.OK)
		throw "gnome_keyring_create_sync failed: " + error;
};

var destroy = function(keyring) {
	var error = gnome_keyring_delete_sync(keyring);
	if(error != Values.Result.OK)
		throw "gnome_keyring_delete_sync failed: " + error;
};

var unlock = function(keyring, password) {
	if(typeof password != "string")
		password = null;
	var error = gnome_keyring_unlock_sync(keyring, password);
	if(error != Values.Result.OK && error != Values.Result.ALREADY_UNLOCKED)
		throw "gnome_keyring_unlock_sync failed: " + error;
};

var lock = function(keyring) {
	var error = gnome_keyring_lock_sync(keyring);
	if(error != Values.Result.OK)
		throw "gnome_keyring_lock_sync failed: " + error;
};

var getInfo = function(keyring) {
	var info = Type.GnomeKeyringInfo(0);
	var error = gnome_keyring_get_info_sync(keyring, info.address());
	if(error != Values.Result.OK)
		throw "gnome_keyring_get_info_sync failed: " + error;

	return info;
};

var isLocked = function(keyring) {
	var info = getInfo(keyring);
	return gnome_keyring_info_get_is_locked(info);
};

var changePassword = function(keyring, oldPassword, newPassword) {
	var error = gnome_keyring_change_password_sync(keyring, oldPassword, newPassword);
	if(error != Values.Result.OK)
		throw "gnome_keyring_change_password_sync failed: " + error;
};

var getNames = function() {
	var list = Type.GList.ptr(0);
	var error = gnome_keyring_list_keyring_names_sync(list.address())
	if(error != Values.Result.OK)
		throw "gnome_keyring_list_keyring_names_sync failed: " + error;

	var names = [];
	while(!list.isNull()) {
		var name = ctypes.cast(list.contents.data, Type.char.ptr);
		names.push(name.readString());
		list = ctypes.cast(list.contents.next, Type.GList.ptr);
	}

	return names;
};

var getItemIDs = function(keyring) {
	var list = Type.GList.ptr(0);
	var error = gnome_keyring_list_item_ids_sync(keyring, list.address());
	if(error != Values.Result.OK)
		throw "gnome_keyring_list_item_ids_sync failed: " + error;

	var idsOut = [];
	while(!list.isNull()) {
		var itemptr = ctypes.cast(list.contents.data, Type.char.ptr);
		idsOut.push(ctypes.cast(itemptr, Type.guint32).value);
		list = ctypes.cast(list.contents.next, Type.GList.ptr);
	}

	return idsOut;
};

var getItems = function(keyring) {
	var ids = getItemIDs(keyring, ids);

	var itemsOut = [];
	for(var i=0; i<ids.length; i++) {
		var info = itemGetInfo(keyring, ids[i]);
		var attributes = itemGetAttributes(keyring, ids[i]);

		itemsOut.push({
			id: ids[i],
			displayName: info.displayName,
			secret: info.secret,
			type: info.type,
			attributes: attributes,
			toString: function() {
				var str = this.id + ": " + this.displayName + ": \n" +
					"  Password: " + this.secret + "\n" +
					"  Type: " + this.type + "\n" +
					"  Attributes:\n";
				for(var key in this.attributes)
					str += "    " + key + ": " + this.attributes[key] + "\n";
				return str;
			}
		});
	}

	return itemsOut;
};

var itemCreate = function(keyring, type, displayName, attributes, secret,
			      update_if_exists) {
	var error = Values.Result.OK;
	var attr = gnome_keyring_attribute_list_new();
	if(attr == null)
		throw "gnome_keyring_attribute_list_new failed";

	for(var key in attributes) {
		gnome_keyring_attribute_list_append_string(attr, key, attributes[key]);
	}

	var itemIdOut = Type.guint32();
	error = gnome_keyring_item_create_sync(keyring, type, displayName, attr,
					       secret, update_if_exists, itemIdOut.address());
	if(error != Values.Result.OK)
		throw "gnome_keyring_item_create_sync failed: " + error;

	gnome_keyring_attribute_list_free(attr);
	attr = null;

	return itemIdOut;
};

var itemDelete = function(keyring, id) {
	var error = gnome_keyring_item_delete_sync(keyring, id);
	if(error != Values.Result.OK)
		throw "gnome_keyring_item_delete_sync failed: " + error;
};

var itemGetInfo = function(keyring, id) {
	var info = Type.GnomeKeyringItemInfo(0);
	var error = gnome_keyring_item_get_info_sync(keyring, id, info.address());
	if(error != Values.Result.OK)
		throw "gnome_keyring_item_get_info_sync failed: " + error;

	return {
		displayName: gnome_keyring_item_info_get_display_name(info).readString(),
		secret: gnome_keyring_item_info_get_secret(info).readString(),
		type: gnome_keyring_item_info_get_type(info)
	};
};

var itemGetAttributes = function(keyring, id) {
	var attributes = Type.GnomeKeyringAttributeList.ptr(0);
	var error = gnome_keyring_item_get_attributes_sync(keyring, id, attributes.address());
	if(error != Values.Result.OK)
		throw "gnome_keyring_item_get_attributes_sync failed: " + error;

	var attributesOut = {};
	var arrayType = new ctypes.ArrayType(Type.GnomeKeyringAttribute,
					     attributes.contents.len);
	var array = ctypes.cast(attributes.contents.data, arrayType.ptr).contents
	for(var i=0; i<array.length; i++) {
		var value = null;
		if(array[i].type == Values.AttributeType.STRING)
			value = gnome_keyring_attribute_get_string(array[i].address()).readString();
		else if(array[i].type == Values.AttributeType.UINT32)
			value = gnome_keyring_attribute_get_uint32(array[i].address());
		attributesOut[array[i].name.readString()] = value;
	}

	return attributesOut;
};

