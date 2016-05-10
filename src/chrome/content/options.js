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
		this.setupPrefs();
		this.setupContacts();
		this.updateTrayIcon();
		this.updateControls();
		this.renderSoundsList();
	},

	setupPrefs : function () {
		this.prefs = Cc['@mozilla.org/preferences-service;1']
			.getService(Ci.nsIPrefService)
			.getBranch('extensions.tbchatnotification.');
		this.prefs.QueryInterface(Ci.nsIPrefBranch);
	},

	setupContacts : function () {
		this.contacts = Cc['@mozilla.org/chat/contacts-service;1']
			.getService(Ci.imIContactsService);
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

	renderSoundsList : function () {
		var self = this;
		var sounds = this.getSoundsListPref();
		Object.keys(sounds).forEach(function (key) {
			// TODO: render list elements
		});
	},

	getSoundsListPref : function () {
		var pref = this.prefs.getCharPref('soundfilespecific');
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
	* Show select file dialog and save path to textbox.
	* @param string elementId
	*/
	getFile : function(elementId) {
		try {
			var textbox = this.$(elementId);
		
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
