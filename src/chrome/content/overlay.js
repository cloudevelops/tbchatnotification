(function() {

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const osWindows = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime).OS == 'WINNT';

var TbChatNotifier = {

	prefs : null,
	observer : null,
	observerTopics : {
		newDirectedIncomingMessage : 'new-directed-incoming-message',
		newText : 'new-text',
		unreadImCountChanged : 'unread-im-count-changed'
	},
	audio : null,
	defaultSound: 'chrome://TbChatNotification/content/sound/notification.ogg',
	muteSound: 'chrome://TbChatNotification/content/sound/mute.ogg',

	trayicon : {
		loaded : false,
		conversation : ''
	},

	options : {
		shownotification : true,
		showbody : false,
		playsound : false,
		soundfile : '',
		soundfilemuc: '',
		soundfileuser: '',
		soundfilemention: '',
		soundfilespecific: {},
		playsoundfocused : false,
		trayicon : false,
		flashicon : false,
		allincoming : false
	},

	/**
	* Load chat notifier.
	*/
	load : function() {
		// Load preferences
		var prefs = this.prefs = Components
		  .classes['@mozilla.org/preferences-service;1']
		  .getService(Ci.nsIPrefService)
		  .getBranch('extensions.tbchatnotification.');
		prefs.QueryInterface(Ci.nsIPrefBranch);

		var options = this.options;
		options.getObjectPref = function (key) {
			var result;
			try {
				var pref = prefs.getCharPref(key);
				result = JSON.parse(pref);
			} catch (e) {}
			if (result == null || typeof result !== 'object') {
				result = {};
			}
			return result;
		};
		options.observe = function(subject, topic, data) {
			if (topic != 'nsPref:changed') {
				return;
			}

			switch(data) {
				case 'shownotification' :
					this.shownotification = prefs.getBoolPref('shownotification');
					break;
				case 'showbody' :
					this.showbody = prefs.getBoolPref('showbody');
					break;
				case 'playsound' :
					this.playsound = prefs.getBoolPref('playsound');
					break;
				case 'soundfile' :
					this.soundfile = prefs.getCharPref('soundfile');
					break;
				case 'soundfilemuc' :
					this.soundfilemuc = prefs.getCharPref('soundfilemuc');
					break;
				case 'soundfileuser' :
					this.soundfileuser = prefs.getCharPref('soundfileuser');
					break;
				case 'soundfilemention' :
					this.soundfilemention = prefs.getCharPref('soundfilemention');
					break;
				case 'soundfilespecific' :
					this.soundfilespecific = this.getObjectPref('soundfilespecific');
					break;
				case 'playsoundfocused' :
					this.playsoundfocused = prefs.getBoolPref('playsoundfocused');
					break;
				case 'trayicon' :
					this.trayicon = prefs.getBoolPref('trayicon');
					break;
				case 'flashicon' :
					this.flashicon = prefs.getBoolPref('flashicon');
					break;
				case 'allincoming' :
					this.allincoming = prefs.getBoolPref('allincoming');
					break;
			}
		};
		prefs.addObserver('', options, false);

		if (!prefs.getBoolPref('versiondetect')) {
			var appInfo = Components
				.classes['@mozilla.org/xre/app-info;1']
				.getService(Components.interfaces.nsIXULAppInfo);
			var versionChecker = Components
				.classes['@mozilla.org/xpcom/version-comparator;1']
				.getService(Components.interfaces.nsIVersionComparator);

			// disable for Thunderbird > 31, there is another chat notification system
			if (versionChecker.compare(appInfo.version, '31') >= 0) {
				prefs.setBoolPref('versiondetect', true);
				prefs.setBoolPref('shownotification', false);
			}
		}

		options.shownotification = prefs.getBoolPref('shownotification');
		options.showbody = prefs.getBoolPref('showbody');
		options.playsound = prefs.getBoolPref('playsound');
		options.soundfile = prefs.getCharPref('soundfile');
		options.soundfilemuc = prefs.getCharPref('soundfilemuc');
		options.soundfileuser = prefs.getCharPref('soundfileuser');
		options.soundfilemention = prefs.getCharPref('soundfilemention');
		options.soundfilespecific = options.getObjectPref('soundfilespecific');
		options.playsoundfocused = prefs.getBoolPref('playsoundfocused');
		options.trayicon = prefs.getBoolPref('trayicon');
		options.flashicon = prefs.getBoolPref('flashicon');
		options.allincoming = prefs.getBoolPref('allincoming');

		// Messages listener
		Cu.import('resource://gre/modules/XPCOMUtils.jsm');
		Cu.import('resource://gre/modules/Services.jsm');

		var imServices = {};
		Cu.import("resource:///modules/imServices.jsm", imServices);
		imServices = imServices.Services;

		var observerTopics = this.observerTopics;

		var notifier = this;
		var observer = this.observer = {
			observe: function(subject, topic, data) {
				if (subject.incoming && (((topic == observerTopics.newDirectedIncomingMessage) && !options.allincoming) || ((topic == observerTopics.newText) && options.allincoming))) {
					notifier.notify(subject, imServices.conversations.getUIConversation(subject.conversation).title);
				} else if (topic == observerTopics.unreadImCountChanged) {
					if (data == 0) {
						notifier.closeTrayIcon()
					}
				}
			},

			QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference])
		};

		for (var topic in observerTopics) {
			Services.obs.addObserver(observer, observerTopics[topic], true);
		}
	},

	/**
	 * Unload chat notifier.
	 */
	unload : function() {
		this.prefs.removeObserver('', this.options);

		var observer = this.observer,
			observerTopics = this.observerTopics;

		for (var topic in observerTopics) {
			Services.obs.removeObserver(observer, observerTopics[topic]);
		}

		if (this.trayicon.loaded) {
			TrayIcon.destroy();
		}
	},

	/**
	* Play sound.
	 * @param subject object
	*/
	play : function(subject) {
		if (this.audio == null) {
			this.audio = new Audio();
		}

		this.audio.pause();
		this.audio.src = this.getAudioSrc(subject);
		this.audio.play();
	},

	/**
	 * Get get audio file for the notification
	 * @param subject object
	 */
	getAudioSrc : function (subject) {
		var src;

		if (this.canNotifyOfMention(subject)) {
			src = this.options.soundfilemention;
		} else if (this.canNotifyOfSpecificChat(subject)) {
			src = this.getAudioSrcForSpecificChat(subject);
		} else if (this.canNotifyOfMUC(subject)) {
			src = this.options.soundfilemuc;
		} else if (this.canNotifyOfPM(subject)) {
			src = this.options.soundfileuser;
		} else if (this.options.soundfile) {
			src = this.options.soundfile;
		}

		if (src == null) {
			return this.defaultSound;
		} else {
			return 'file://' + src;
		}
	},

	/**
	 * Get audio file for a specific chat
	 * @param subject {Object}
	 * @returns {*}
	 */
	getAudioSrcForSpecificChat : function (subject) {
		var key = subject.conversation.isChat ? subject.conversation.name : subject.alias;
		var prefs = this.options.soundfilespecific[key];
		if (prefs.mute) {
			return this.muteSound;
		} else {
			return prefs.soundFile;
		}
	},

	/**
	 * Check if can notify about a mention in a message
	 * @param subject object
	 * @returns {boolean}
	 */
	canNotifyOfMention : function (subject) {
		return Boolean(subject.conversation.isChat
			&& subject.containsNick && this.options.soundfilemention);
	},

	/**
	 * Check if we can notify about a message in a specific chat (user to user or MUC)
	 * @param subject {Object}
	 */
	canNotifyOfSpecificChat : function (subject) {
		var key = subject.conversation.isChat ? subject.conversation.name : subject.alias;
		var prefs = this.options.soundfilespecific[key];
		return Boolean(prefs && (prefs.mute || prefs.soundFile));
	},

	/**
	 * Check if can notify about a message in a MUC
	 * @param subject object
	 * @returns {boolean}
	 */
	canNotifyOfMUC : function (subject) {
		return Boolean(subject.conversation.isChat && this.options.soundfilemuc);
	},

	/**
	 * Check if can notify about a private message
	 * @param subject object
	 * @returns {boolean}
	 */
	canNotifyOfPM : function (subject) {
		return Boolean(!subject.conversation.isChat && this.options.soundfileuser);
	},

	/**
	 * Show non-modal alert message.
	 * @param subject object
	 * @param conversation string
	 */
	notify : function(subject, conversation) {
		var notifier = this;
		var options = this.options;
		var activeConversation = this.isConversationActive(conversation);
		var from = subject.alias;
		var message = subject.originalMessage;

		if (options.playsound && (!activeConversation || options.playsoundfocused)) {
			this.play(subject);
		}

		if (activeConversation) {
			return;
		}

		var text = options.showbody ? (message > 128 ? (message.substring(0, 128) + '...') : message) : this.string('showmessage');

		if (options.shownotification) {
			try {
				var	listener = {
					observe : function(subject, topic, data) {
						if (topic == 'alertclickcallback') {
							notifier.openChat(data);
						}
					}
				}

				Cc['@mozilla.org/alerts-service;1']
					.getService(Ci.nsIAlertsService)
					.showAlertNotification('chrome://TbChatNotification/skin/icon32.png', from, text, true, conversation, listener);

			} catch(e) {
				// prevents runtime error on platforms that don't implement nsIAlertsService
			}
		}

		if (osWindows && options.trayicon) {
			var trayicon = this.trayicon;

			trayicon.conversation = conversation;

			if (!trayicon.loaded) {
				Cu.import('resource://TbChatNotification/trayicon.jsm');

				TrayIcon.init(window);

				window.addEventListener('TrayIconDblClick', function() {
					TrayIcon.restoreThunderbird();
					notifier.openChat(trayicon.conversation);
				}, true);

				window.addEventListener('focus', function() {
					notifier.closeTrayIcon();
				}, false);

				trayicon.loaded = true;
			}

			var trayTitle = this.string('newmessage') + ' ' + from;
			TrayIcon.show(trayTitle);
		}

		if (options.flashicon) {
			window.getAttention();
		}
	},

	/**
	 * Check if is focused chat windows with active conversation.
	 * @param string conversation
	 * @return bool
	 */
	isConversationActive : function(conversation) {
		if (!document.hasFocus()) {
			return false;
		}

		var tab = document.getElementById('tabmail').selectedTab;
		if (!tab || (tab.title.toLowerCase().indexOf('chat') != 0)) {
			return false;
		}

		var contactList = document.getElementById('contactlistbox');
		if (!contactList) {
			return false;
		}

		var selectedConversation = contactList.selectedItem;
		if (!selectedConversation) {
			return false;
		}

		return selectedConversation.displayName == conversation;
	},

	/*
	 * Open chat tab with conversation.
	 * @param string conversation
	 */
	openChat : function(conversation) {
		try {
			var win = Services.wm.getMostRecentWindow('mail:3pane');
			if (win) {
				win.focus();
				win.showChatTab();

				var contacts = document.getElementById('contactlistbox');
				for (var i = 0; i < contacts.itemCount; i++) {
					var contact = contacts.getItemAtIndex(i);

					if (!contact || contact.hidden || (contact.localName != 'imconv')) {
						continue;
					} else if (contact.displayName == conversation) {
						contacts.selectedIndex = i;
						break;
					}
				}
			} else {
				window.openDialog('chrome://messenger/content/', '_blank',
					'chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar',
					null, {tabType: 'chat', tabParams: {}});
			}
		} catch (e) {
			// prevents runtime error
		}
	},

	/*
	 * Close tray icon.
	 */
	closeTrayIcon : function() {
		if (this.trayicon.loaded) {
			TrayIcon.close();
		}
	},

	/**
	 * Get locale string.
	 * @param string
	 */
	string : function(string) {
		return this.$('Strings').getString('tbchatnotification.' + string);
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
 * Load extension...
 */
window.addEventListener('load', function() {
	TbChatNotifier.load();
}, false);

/**
 * Unload extension...
 */
window.addEventListener('unload', function() {
	TbChatNotifier.unload();
}, false);

})();
