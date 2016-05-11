(function() {

this.tbchatnotification = this.tbchatnotification || {};

const Cc = Components.classes;
const Ci = Components.interfaces;

"use strict";

var options = {
	// Selectors for the elements
	selectors : {
		userId: '.tbchatnotificationUser',
		mute: '.tbchatnotificationMute',
		soundFile: '.tbchatnotificationSoundFile',
		usersList: '#tbchatnotificationUsersList',
		usersListPopup: '#tbchatnotificationUsersList > menupopup',
		soundsList: '#tbchatnotificationSoundsList'
	},

	/**
	 * Initialize logic
	 */
	load : function () {
		this.setupApplicationService();
		this.setupPrefsService();
		this.setupContactsService();
		this.setupConversationsService();
		this.updateTrayIcon();
		this.updateControls();
		this.renderSoundsList();
	},

	setupApplicationService : function () {
		this.applicationService = Cc["@mozilla.org/steel/application;1"]
			.getService(Ci.steelIApplication)
	},

	setupPrefsService : function () {
		this.prefsService = Cc['@mozilla.org/preferences-service;1']
			.getService(Ci.nsIPrefService)
			.getBranch('extensions.tbchatnotification.');
		this.prefsService.QueryInterface(Ci.nsIPrefBranch);
	},

	setupContactsService : function () {
		this.contactsService = Cc['@mozilla.org/chat/contacts-service;1']
			.getService(Ci.imIContactsService);
	},

	setupConversationsService: function () {
		this.conversationsService = Cc['@mozilla.org/chat/conversations-service;1']
			.getService(Ci.imIConversationsService);
	},

	/**
	 * Update state of the tray icon
	 */
	updateTrayIcon : function () {
		if (Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime).OS != 'WINNT') {
			this.$('TrayIconCheckbox').hidden = true;
			window.sizeToContent();
		}
	},

	/**
	 * Get container for the user/chat-specific settings
	 * @returns {Element}
	 */
	getSoundsListContainer : function () {
		return document.querySelector(this.selectors.soundsList);
	},

	/**
	 * Handler for the click event of the Add button
	 */
	onAddButtonClick : function () {
		var userId = document.querySelector(this.selectors.usersList).value;
        if (userId) {
			if (this.getSoundsListPref().hasOwnProperty(userId)) {
				alert('Settings for this user already exist');
			} else {
				this.addListItem(userId);
			}
		} else {
			alert('You must specify a user or a chat');
		}
	},

	/**
	 * Add a new item to the list of specific sounds
	 * @param userId string
	 */
	addListItem : function (userId) {
		var container = this.getSoundsListContainer();
		var sampleItem = container.firstChild;
		var newItem = sampleItem.cloneNode(true);
		newItem.hidden = false;
		container.appendChild(newItem);
        newItem.querySelector(this.selectors.userId).value = userId;
	},

	/**
	 * Remove an item from the list of specific sounds
	 * @param button
	 */
	deleteListItem : function (button) {
		var item = button.parentNode;
		item.remove();
	},

	getContactsForCompletion : function () {
		var contacts = this.contactsService.getContacts().map(function (c) {
			return c.displayName;
		});
		this.conversationsService.getUIConversations().forEach(function (c) {
			if (contacts.indexOf(c.title) === -1) {
				contacts.push(c.title);
			}
		});
		return contacts.sort();
	},

	addContactsForCompletion : function () {
		var container = document.querySelector(this.selectors.usersListPopup);
		this.getContactsForCompletion().forEach(function (contact) {
			var menuitem = document.createElement('menuitem');
			menuitem.setAttribute('label', contact);
			container.appendChild(menuitem);
		});
	},

	renderSoundsList : function () {
		var self = this;
		var sounds = this.getSoundsListPref();
		Object.keys(sounds).forEach(function (key) {
			// TODO: render list elements
		});
		this.addContactsForCompletion();
	},

	getSoundsListPref : function () {
		var pref = this.prefsService.getCharPref('soundfilespecific');
		var result;
		try {
			result = JSON.parse(pref);
		} catch (e) {}
		if (result == null || typeof result !== 'object') {
			result = {};
		}
		return result;
	},

	/**
	 * Update users/chats sound preferences
	 * @param value {Object}
	 */
	setSoundsListPref : function (value) {
		var serialized;
		try {
			serialized = JSON.stringify(value);
		} catch (e) {
			serialized = '{}';
		}
		this.prefsService.setCharPref('soundfilespecific', serialized);
	},

	/**
	 * Set sound preferences for a specific user
	 * @param userId {String}
	 * @param options {Object}
	 */
	setUserSoundPref : function (userId, options) {
		var prefs = this.getSoundsListPref();
		prefs[userId] = options;
		this.setSoundsListPref(prefs);
	},

	/** Set sound for a specific user
	 * @param target
	 */
	changeUserSound : function (target) {
		var textbox = target.parentNode.querySelector(this.selectors.soundFile);
		this.showFilePicker(textbox);
		this.updateUserPrefs(textbox);
	},

	/**
	 * Update preferences for a specific user
	 * @param target
	 */
	updateUserPrefs : function (target) {
		var listItem = target.parentNode;
		var userId = listItem.querySelector(this.selectors.userId).value;
		var mute = listItem.querySelector(this.selectors.mute).checked;
		var soundFile = listItem.querySelector(this.selectors.soundFile).value;
		this.setUserSoundPref(userId, {
			mute: mute,
			soundFile: soundFile
		});
	},

	/**
	* Show select file dialog and save path to textbox.
	* @param elementId string
	*/
	getFile : function(elementId) {
		this.showFilePicker(this.$(elementId));
	},

	showFilePicker : function (textbox) {
		try {
			var nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes['@mozilla.org/filepicker;1']
				.createInstance(nsIFilePicker);

			if (textbox.value) {
				var initDir = Components.classes['@mozilla.org/file/local;1']
					.createInstance(Components.interfaces.nsIFile);
				initDir.initWithPath(textbox.value);

				if (!initDir.isDirectory()) {
					initDir = initDir.parent;
				}

				fp.displayDirectory = initDir;
			}

			fp.init(window, this.string('selectfile'), nsIFilePicker.modeOpen);
			fp.appendFilter(this.string('supportedfiles'), '*.mp3; *.wav; *.aac; *.mp4; *.ogg; *.webm;');
			var dialog = fp.show();
			if (dialog == nsIFilePicker.returnOK){
				textbox.value = fp.file.path;
			}
		} catch (e) {
			dump(e);
		}
	},

	/**
	 * Update control properties.
	 */
	updateControls : function() {
		this.$('ShowBodyCheckbox').disabled = !this.$('ShowNotification').value;
		this.$('PlaySoundFocusedCheckbox').disabled = !this.$('PlaySound').value;
	},

	/**
	* Get localized string.
	* @return string
	*/
	string : function(string) {
		return this.$('Strings').getString('options.' + string);
	},

	/**
	* Get element on document.
	* @param string id
	* @return object XUL
	*/
	$ : function(id) {
		var element = document.getElementById('tbchatnotification' + id);
		if (element) {
			return element;
		} else {
			throw 'No element "' + id + '".';
		}
	}

};

/**
 * Load options...
 */
window.addEventListener('load', function() {
	options.load();
}, false);

tbchatnotification.options = options;

})();
