(function() {

this.tbchatnotification = this.tbchatnotification || {};

const Cc = Components.classes;
const Ci = Components.interfaces;

"use strict";

var options = {
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
	 * Add a new item to the list of specific sounds
	 * @param containerId string
	 */
	addListItem : function (containerId) {
		var container = this.$(containerId);
		var sampleItem = container.firstChild;
		var newItem = sampleItem.cloneNode(true);
		this.addContactsForCompletion(newItem.querySelector('menulist > menupopup'));
		newItem.hidden = false;
		container.appendChild(newItem);
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

	addContactsForCompletion : function (container) {
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

	changeUserPref : function (target) {
		//var item = target.parentNode;
		this.applicationService.console.log(
			target.tagName +
			"   :   " +
			(target.value || target.checked)
		);
	},

	changeUserSound : function (target) {
		var textbox = target.parentNode.querySelector('textbox');
		this.showFilePicker(textbox);
		this.changeUserPref(textbox);
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
