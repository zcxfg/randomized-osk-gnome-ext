"use strict";
const { Gio, St, Clutter, GObject } = imports.gi;
const Main = imports.ui.main;
const Keyboard = imports.ui.keyboard;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const InputSourceManager = imports.ui.status.keyboard;
const KeyboardModel = Keyboard.KeyboardModel;
const KeyContainer = Keyboard.KeyContainer;

const A11Y_APPLICATIONS_SCHEMA = "org.gnome.desktop.a11y.applications";
let _oskA11yApplicationsSettings;
let backup_lastDeviceIsTouchScreen;
let backup_relayout;
let backup_DefaultKeysForRow;
let backup_keyboardControllerConstructor;
let backup_keyvalPress;
let backup_keyvalRelease;
let backup_commitString;
let backup_loadDefaultKeys;
let backup_createLayersForGroup;
let backup_commitAction;
let _indicator;
let settings;
let rand;

// Indicator
let OSKIndicator = GObject.registerClass(
  { GTypeName: "OSKIndicator" },
  class OSKIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, `${Me.metadata.name} Indicator`, false);

      let icon = new St.Icon({
        icon_name: "input-keyboard-symbolic",
        style_class: "system-status-icon",
      });

      this.add_child(icon);

      this.connect("button-press-event", function (actor, event) {
        let button = event.get_button();

        if (button == 1) {
          if (Main.keyboard._keyboard._keyboardVisible) return Main.keyboard.close();

          Main.keyboard.open(Main.layoutManager.bottomIndex);
        }
        if (button == 3) {
          ExtensionUtils.openPrefs();
        }
      });

      this.connect("touch-event", function () {
        if (Main.keyboard._keyboard._keyboardVisible) return Main.keyboard.close();

        Main.keyboard.open(Main.layoutManager.bottomIndex);
      });
    }
  }
);


function rearrange(keyboardModel) {
  let levels = keyboardModel.getLevels();
  for (let nlevel = 0; nlevel < levels.length; ++nlevel) {
    let level = levels[nlevel];
    let mappings = Array();
    let rows = level['rows'];
    for (let nrow = 0, counter = 0; nrow < rows.length; ++nrow) {
      let row = rows[nrow];
      for (let nbtn = 0; nbtn < row.length; ++nbtn) {
        let btn = row[nbtn];
        if (btn.indexOf(' ') < 0) {
          mappings[counter++] = btn;
        }
      }
    }
    rand.shuffle(mappings);
    let level_new = JSON.parse(JSON.stringify(level));
    let rows_new = level_new['rows'];
    for (let nrow = 0, cursor = 0; nrow < rows_new.length; ++nrow) {
      let row = rows_new[nrow];
      for (let nbtn = 0; nbtn < row.length; ++nbtn) {
        let btn = row[nbtn];
        if (btn.indexOf(' ') < 0) {
          row[nbtn] = mappings[cursor++];
        }
      }
    }
    levels[nlevel] = level_new;
  }
}

let GRand = GObject.registerClass(
  { GTypeName: "GRand" }, 
  class GRand extends GObject.Object {
    _init() {
      super._init();
      this._pass = 3;
      this._randomSource = Gio.File.new_for_path("/dev/urandom");
      this._randomIStream = null;
      try {
        this._ioStream = this._randomSource.open_readwrite(null);
        this._randomIStream = this._ioStream.get_input_stream();
      } catch (_) {
        console.error(_);
      }
    }

    randint(from, until) {
      if (this._randomIStream === null) {
        throw new Error("Fail to open the random source.");
      }
      let bytes = this._randomIStream.read_bytes(1, null); // GLib.Bytes
      let byte_array = bytes.unref_to_array(); // GLib.ByteArray
      let number = (Number) (byte_array[0]);
      return number % (until - from) + from;
    }

    shuffle(arr) {
      if (! arr instanceof Array) {
        console.warn("shuffle() is only apply to arrays");
        return;
      }
      for (let i = 0; i < (this._pass * arr.length); ++i) {
        let x = this.randint(0, arr.length);
        let y = this.randint(0, arr.length);
        if (x != y) {
          let tmp = arr[x];
          arr[x] = arr[y];
          arr[y] = tmp;
        }
      }
    }
  }
)


// Overrides
function override_lastDeviceIsTouchScreen() {
  if (!this._lastDevice) return false;

  let deviceType = this._lastDevice.get_device_type();

  return settings.get_boolean("ignore-touch-input")
    ? false
    : deviceType == Clutter.InputDeviceType.TOUCHSCREEN_DEVICE;
}

function override_relayout() {
  let monitor = Main.layoutManager.keyboardMonitor;

  if (!monitor) return;

  this.width = monitor.width;

  if (monitor.width > monitor.height) {
    this.height = (monitor.height * settings.get_int("landscape-height")) / 100;
  } else {
    this.height = (monitor.height * settings.get_int("portrait-height")) / 100;
  }
}

function override_keyvalPress(keyval) {
  // This allows manually releasing a latched ctrl/super/alt keys by tapping on them again
  if (keyval == Clutter.KEY_Control_L) {
    this._controlActive = !this._controlActive;

    if (this._controlActive) {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Control_L,
          Clutter.KeyState.PRESSED
      );
      Main.layoutManager.keyboardBox.add_style_class_name("control-key-latched");
    } else {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Control_L,
          Clutter.KeyState.RELEASED
      );
      Main.layoutManager.keyboardBox.remove_style_class_name("control-key-latched");
    }

    return;
  }

  if (keyval == Clutter.KEY_Super_L) {
    this._superActive = !this._superActive;

    if (this._superActive) {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Super_L,
          Clutter.KeyState.PRESSED
      );
      Main.layoutManager.keyboardBox.add_style_class_name("super-key-latched");
    } else {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Super_L,
          Clutter.KeyState.RELEASED
      );
      Main.layoutManager.keyboardBox.remove_style_class_name("super-key-latched");
    }

    return;
  }

  if (keyval == Clutter.KEY_Alt_L) {
    this._altActive = !this._altActive;

    if (this._altActive) {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Alt_L,
          Clutter.KeyState.PRESSED
      );
      Main.layoutManager.keyboardBox.add_style_class_name("alt-key-latched");
    } else {
      this._virtualDevice.notify_keyval(
          Clutter.get_current_event_time(),
          Clutter.KEY_Alt_L,
          Clutter.KeyState.RELEASED
      );
      Main.layoutManager.keyboardBox.remove_style_class_name("alt-key-latched");
    }

    return;
  }

  // Not a ctrl/super/alt key, continue down original execution path
  this._virtualDevice.notify_keyval(
      Clutter.get_current_event_time(),
      keyval,
      Clutter.KeyState.PRESSED
  );
}

function override_keyvalRelease(keyval) {
  // By default each key is released immediately after being pressed.
  // Don't release ctrl/alt/super keys to allow them to be latched
  // and used in "ctrl/alt/super + key" combinations
  if (
      keyval == Clutter.KEY_Control_L
      || keyval == Clutter.KEY_Alt_L
      || keyval == Clutter.KEY_Super_L
  ) {
    return;
  }

  this._virtualDevice.notify_keyval(
      Clutter.get_current_event_time(),
      keyval,
      Clutter.KeyState.RELEASED
  );

  if (this._controlActive) {
    this._virtualDevice.notify_keyval(
        Clutter.get_current_event_time(),
        Clutter.KEY_Control_L,
        Clutter.KeyState.RELEASED
    );
    this._controlActive = false;
    Main.layoutManager.keyboardBox.remove_style_class_name("control-key-latched");
  }
  if (this._superActive) {
    this._virtualDevice.notify_keyval(
        Clutter.get_current_event_time(),
        Clutter.KEY_Super_L,
        Clutter.KeyState.RELEASED
    );
    this._superActive = false;
    Main.layoutManager.keyboardBox.remove_style_class_name("super-key-latched");
  }
  if (this._altActive) {
    this._virtualDevice.notify_keyval(
        Clutter.get_current_event_time(),
        Clutter.KEY_Alt_L,
        Clutter.KeyState.RELEASED
    );
    this._altActive = false;
    Main.layoutManager.keyboardBox.remove_style_class_name("alt-key-latched");
  }
}

function override_getDefaultKeysForRow(row, numRows, level) {
  let defaultKeysPreMod = [
    [
      [{ label: "Esc", width: 1, keyval: Clutter.KEY_Escape }],
      [{ label: "↹", width: 1.5, keyval: Clutter.KEY_Tab }],
      [
        {
          label: "⇑",
          width: 1.5,
          level: 1,
          extraClassName: "shift-key-lowercase",
        },
      ],
      [
        {
          label: "Ctrl",
          width: 1,
          keyval: Clutter.KEY_Control_L,
          extraClassName: "control-key",
        },
        {
          label: "◆",
          width: 1,
          keyval: Clutter.KEY_Super_L,
          extraClassName: "super-key",
        },
        {
          label: "Alt",
          width: 1,
          keyval: Clutter.KEY_Alt_L,
          extraClassName: "alt-key",
        },
      ],
    ],
    [
      [{ label: "Esc", width: 1, keyval: Clutter.KEY_Escape }],
      [{ label: "↹", width: 1.5, keyval: Clutter.KEY_Tab }],
      [{ label: "⇑", width: 1.5, level: 0, extraClassName: "shift-key-uppercase" }],
      [
        {
          label: "Ctrl",
          width: 1,
          keyval: Clutter.KEY_Control_L,
          extraClassName: "control-key",
        },
        {
          label: "◆",
          width: 1,
          keyval: Clutter.KEY_Super_L,
          extraClassName: "super-key",
        },
        {
          label: "Alt",
          width: 1,
          keyval: Clutter.KEY_Alt_L,
          extraClassName: "alt-key",
        },
      ],
    ],
    [
      [{ label: "Esc", width: 1, keyval: Clutter.KEY_Escape }],
      [{ label: "↹", width: 1.5, keyval: Clutter.KEY_Tab }],
      [{ label: "=/<F", width: 1.5, level: 3 }],
      [
        {
          label: "Ctrl",
          width: 1,
          keyval: Clutter.KEY_Control_L,
          extraClassName: "control-key",
        },
        {
          label: "◆",
          width: 1,
          keyval: Clutter.KEY_Super_L,
          extraClassName: "super-key",
        },
        {
          label: "Alt",
          width: 1,
          keyval: Clutter.KEY_Alt_L,
          extraClassName: "alt-key",
        },
      ],
    ],
    [
      [{ label: "Esc", width: 1, keyval: Clutter.KEY_Escape }],
      [{ label: "↹", width: 1.5, keyval: Clutter.KEY_Tab }],
      [{ label: "?123", width: 1.5, level: 2 }],
      [
        {
          label: "Ctrl",
          width: 1,
          keyval: Clutter.KEY_Control_L,
          extraClassName: "control-key",
        },
        {
          label: "◆",
          width: 1,
          keyval: Clutter.KEY_Super_L,
          extraClassName: "super-key",
        },
        {
          label: "Alt",
          width: 1,
          keyval: Clutter.KEY_Alt_L,
          extraClassName: "alt-key",
        },
      ],
    ],
  ];

  let defaultKeysPostMod = [
    [
      [
        { label: "⌫", width: 1.5, keyval: Clutter.KEY_BackSpace },
        { label: "⌦", width: 1, keyval: Clutter.KEY_Delete },
        { label: "⇊", width: 1, action: "hide", extraClassName: "hide-key" },
      ],
      [
        {
          label: "⏎",
          width: 2,
          keyval: Clutter.KEY_Return,
          extraClassName: "enter-key",
        },
        {
          label: "🗺",
          width: 1.5,
          action: "languageMenu",
          extraClassName: "layout-key",
        },
      ],
      [
        {
          label: "⇑",
          width: 3,
          level: 1,
          right: true,
          extraClassName: "shift-key-lowercase",
        },
        { label: "?123", width: 1.5, level: 2 },
      ],
      [
        { label: "←", width: 1, keyval: Clutter.KEY_Left },
        { label: "↑", width: 1, keyval: Clutter.KEY_Up },
        { label: "↓", width: 1, keyval: Clutter.KEY_Down },
        { label: "→", width: 1, keyval: Clutter.KEY_Right },
      ],
    ],
    [
      [
        { label: "⌫", width: 1.5, keyval: Clutter.KEY_BackSpace },
        { label: "⌦", width: 1, keyval: Clutter.KEY_Delete },
        { label: "⇊", width: 1, action: "hide", extraClassName: "hide-key" },
      ],
      [
        {
          label: "⏎",
          width: 2,
          keyval: Clutter.KEY_Return,
          extraClassName: "enter-key",
        },
        {
          label: "🗺",
          width: 1.5,
          action: "languageMenu",
          extraClassName: "layout-key",
        },
      ],
      [
        {
          label: "⇑",
          width: 3,
          level: 0,
          right: true,
          extraClassName: "shift-key-uppercase",
        },
        { label: "?123", width: 1.5, level: 2 },
      ],
      [
        { label: "←", width: 1, keyval: Clutter.KEY_Left },
        { label: "↑", width: 1, keyval: Clutter.KEY_Up },
        { label: "↓", width: 1, keyval: Clutter.KEY_Down },
        { label: "→", width: 1, keyval: Clutter.KEY_Right },
      ],
    ],
    [
      [
        { label: "⌫", width: 1.5, keyval: Clutter.KEY_BackSpace },
        { label: "⌦", width: 1, keyval: Clutter.KEY_Delete },
        { label: "⇊", width: 1, action: "hide", extraClassName: "hide-key" },
      ],
      [
        {
          label: "⏎",
          width: 2,
          keyval: Clutter.KEY_Return,
        },
        {
          label: "🗺",
          width: 1.5,
          action: "languageMenu",
          extraClassName: "layout-key",
        },
      ],
      [
        { label: "=/<F", width: 3, level: 3, right: true },
        { label: "ABC", width: 1.5, level: 0 },
      ],
      [
        { label: "←", width: 1, keyval: Clutter.KEY_Left },
        { label: "↑", width: 1, keyval: Clutter.KEY_Up },
        { label: "↓", width: 1, keyval: Clutter.KEY_Down },
        { label: "→", width: 1, keyval: Clutter.KEY_Right },
      ],
    ],
    [
      [
        { label: "F1", width: 1, keyval: Clutter.KEY_F1 },
        { label: "F2", width: 1, keyval: Clutter.KEY_F2 },
        { label: "F3", width: 1, keyval: Clutter.KEY_F3 },
        { label: "⌫", width: 1.5, keyval: Clutter.KEY_BackSpace },
        { label: "⌦", width: 1, keyval: Clutter.KEY_Delete },
        { label: "⇊", width: 1, action: "hide", extraClassName: "hide-key" },
      ],
      [
        { label: "F4", width: 1, keyval: Clutter.KEY_F4 },
        { label: "F5", width: 1, keyval: Clutter.KEY_F5 },
        { label: "F6", width: 1, keyval: Clutter.KEY_F6 },
        {
          label: "⏎",
          width: 2,
          keyval: Clutter.KEY_Return,
          extraClassName: "enter-key",
        },
        {
          label: "🗺",
          width: 1.5,
          action: "languageMenu",
          extraClassName: "layout-key",
        },
      ],
      [
        { label: "F7", width: 1, keyval: Clutter.KEY_F7 },
        { label: "F8", width: 1, keyval: Clutter.KEY_F8 },
        { label: "F9", width: 1, keyval: Clutter.KEY_F9 },
        { label: "?123", width: 3, level: 2, right: true },
        { label: "ABC", width: 1.5, level: 0 },
      ],
      [
        { label: "F10", width: 1, keyval: Clutter.KEY_F10 },
        { label: "F11", width: 1, keyval: Clutter.KEY_F11 },
        { label: "F12", width: 1, keyval: Clutter.KEY_F12 },
        { label: "←", width: 1, keyval: Clutter.KEY_Left },
        { label: "↑", width: 1, keyval: Clutter.KEY_Up },
        { label: "↓", width: 1, keyval: Clutter.KEY_Down },
        { label: "→", width: 1, keyval: Clutter.KEY_Right },
      ],
    ],
  ];

  /* The first 2 rows in defaultKeysPre/Post belong together with
   * the first 2 rows on each keymap. On keymaps that have more than
   * 4 rows, the last 2 default key rows must be respectively
   * assigned to the 2 last keymap ones.
   */
  if (row < 2) {
    return [defaultKeysPreMod[level][row], defaultKeysPostMod[level][row]];
  } else if (row >= numRows - 2) {
    let defaultRow = row - (numRows - 2) + 2;
    return [
      defaultKeysPreMod[level][defaultRow],
      defaultKeysPostMod[level][defaultRow],
    ];
  } else {
    return [null, null];
  }
}

function override_keyboardControllerConstructor() {
  let deviceManager = Clutter.DeviceManager.get_default();
  this._virtualDevice = deviceManager.create_virtual_device(
    Clutter.InputDeviceType.KEYBOARD_DEVICE
  );

  this._inputSourceManager = InputSourceManager.getInputSourceManager();
  this._sourceChangedId = this._inputSourceManager.connect(
    "current-source-changed",
    this._onSourceChanged.bind(this)
  );
  this._sourcesModifiedId = this._inputSourceManager.connect(
    "sources-changed",
    this._onSourcesModified.bind(this)
  );
  this._currentSource = this._inputSourceManager.currentSource;

  this._controlActive = false;
  this._superActive = false;
  this._altActive = false;

  Main.inputMethod.connect(
    "notify::content-purpose",
    this._onContentPurposeHintsChanged.bind(this)
  );
  Main.inputMethod.connect(
    "notify::content-hints",
    this._onContentPurposeHintsChanged.bind(this)
  );
  Main.inputMethod.connect("input-panel-state", (o, state) => {
    this.emit("panel-state", state);
  });
}

function override_commitString(string, fromKey) {
  // Prevents alpha-numeric key presses from bypassing override_keyvalPress()
  // while ctrl/alt/super are latched
  if (
      this._controlActive
      || this._superActive
      || this._altActive
  ) {
    return false;
  }

  if (string == null) return false;
  /* Let ibus methods fall through keyval emission */
  if (fromKey && this._currentSource.type == InputSourceManager.INPUT_SOURCE_TYPE_IBUS) return false;

  Main.inputMethod.commit(string);

  if (settings.get_boolean("update-every-keystroke")) {
    this._onSourcesModified();
  }

  return true;
}

// Bulk of this method remains unchanged, except for extraButton.connect('released') event listener.
// Overriding it to ensure latched ctrl/alt/super keys are released before keyboard is hidden
function override_loadDefaultKeys(keys, layout, numLevels, numKeys) {
  let extraButton;
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let keyval = key.keyval;
    let switchToLevel = key.level;
    let action = key.action;
    let icon = key.icon;

    /* Skip emoji button if necessary */
    if (!this._emojiKeyVisible && action == 'emoji')
      continue;

    extraButton = new Keyboard.Key(key.label || '', [], icon);

    extraButton.keyButton.add_style_class_name('default-key');
    if (key.extraClassName != null)
      extraButton.keyButton.add_style_class_name(key.extraClassName);
    if (key.width != null)
      extraButton.setWidth(key.width);

    let actor = extraButton.keyButton;

    extraButton.connect('pressed', () => {
      if (switchToLevel != null) {
        this._setActiveLayer(switchToLevel);
        // Shift only gets latched on long press
        this._latched = switchToLevel != 1;
      } else if (keyval != null) {
        this._keyboardController.keyvalPress(keyval);
      }
    });
    extraButton.connect('released', () => {
      // === Override starts here ===
      if (keyval != null) return this._keyboardController.keyvalRelease(keyval);

      switch (action) {
        case 'hide':
          // Press latched ctrl/super/alt keys again to release them before hiding OSK
          if (this._keyboardController._controlActive) this._keyboardController.keyvalPress(Clutter.KEY_Control_L);
          if (this._keyboardController._superActive) this._keyboardController.keyvalPress(Clutter.KEY_Super_L);
          if (this._keyboardController._altActive) this._keyboardController.keyvalPress(Clutter.KEY_Alt_L);

          this.close();
          break;

        case 'languageMenu':
          this._popupLanguageMenu(actor);
          break;

        case 'emoji':
          this._toggleEmoji();
          break;

        // no default
      }
      // === Override ends here ===
    });

    if (switchToLevel == 0) {
      layout.shiftKeys.push(extraButton);
    } else if (switchToLevel == 1) {
      extraButton.connect('long-press', () => {
        this._latched = true;
        this._setCurrentLevelLatched(this._currentPage, this._latched);
      });
    }

    /* Fixup default keys based on the number of levels/keys */
    if (switchToLevel == 1 && numLevels == 3) {
      // Hide shift key if the keymap has no uppercase level
      if (key.right) {
        /* Only hide the key actor, so the container still takes space */
        extraButton.keyButton.hide();
      } else {
        extraButton.hide();
      }
      extraButton.setWidth(1.5);
    } else if (key.right && numKeys > 8) {
      extraButton.setWidth(2);
    } else if (keyval == Clutter.KEY_Return && numKeys > 9) {
      extraButton.setWidth(1.5);
    } else if (!this._emojiKeyVisible && (action == 'hide' || action == 'languageMenu')) {
      extraButton.setWidth(1.5);
    }

    layout.appendKey(extraButton, extraButton.keyButton.keyWidth);
  }
}

function override_createLayersForGroup(groupName) {
  let keyboardModel = new KeyboardModel(groupName);
  if (settings.get_boolean("enable-randomization")) {
    rearrange(keyboardModel);
  }
  let layers = {};
  let levels = keyboardModel.getLevels();
  for (let i = 0; i < levels.length; i++) {
      let currentLevel = levels[i];
      /* There are keyboard maps which consist of 3 levels (no uppercase,
       * basically). We however make things consistent by skipping that
       * second level.
       */
      let level = i >= 1 && levels.length == 3 ? i + 1 : i;

      let layout = new KeyContainer();
      layout.shiftKeys = [];
      layout.mode = currentLevel.mode;

      this._loadRows(currentLevel, level, levels.length, layout);
      layers[level] = layout;
      this._aspectContainer.add_child(layout);
      layout.layoutButtons(this._aspectContainer);

      layout.hide();
  }

  return layers;
}

async function override_commitAction(keyval, str) {

  if (this._modifiers.size === 0 && str !== '' &&
    keyval && this._oskCompletionEnabled) {
    if (await Main.inputMethod.handleVirtualKey(keyval))
      return; 
  }

  if (str === '' || !Main.inputMethod.currentFocus ||
    (keyval && this._oskCompletionEnabled) ||
    this._modifiers.size > 0 ||
    !this._keyboardController.commitString(str, true)) {
    if (keyval !== 0) {
      this._forwardModifiers(this._modifiers, Clutter.EventType.KEY_PRESS);
      this._keyboardController.keyvalPress(keyval);
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, KEY_RELEASE_TIMEOUT, () => {
        this._keyboardController.keyvalRelease(keyval);
        this._forwardModifiers(this._modifiers, Clutter.EventType.KEY_RELEASE);
        this._disableAllModifiers();
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  if (settings.get_boolean("update-every-keystroke")) {
    if (str.length > 0) {
      let group = this._keyboardController.getCurrentGroup();
      this._groups[group] = this._createLayersForGroup(group);
      // this._ensureKeysForGroup(group);
    }
  }
}

function enable_overrides() {
  Keyboard.Keyboard.prototype["_relayout"] = override_relayout;
  Keyboard.Keyboard.prototype["_loadDefaultKeys"] = override_loadDefaultKeys;
  Keyboard.Keyboard.prototype["_getDefaultKeysForRow"] = override_getDefaultKeysForRow;
  Keyboard.Keyboard.prototype["_createLayersForGroup"] = override_createLayersForGroup;
  Keyboard.Keyboard.prototype["_commitAction"] = override_commitAction;

  Keyboard.KeyboardController.prototype["constructor"] = override_keyboardControllerConstructor;
  Keyboard.KeyboardController.prototype["keyvalPress"] = override_keyvalPress;
  Keyboard.KeyboardController.prototype["keyvalRelease"] = override_keyvalRelease;
  Keyboard.KeyboardController.prototype["commitString"] = override_commitString;

  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] = override_lastDeviceIsTouchScreen;
}

function disable_overrides() {
  Keyboard.Keyboard.prototype["_relayout"] = backup_relayout;
  Keyboard.Keyboard.prototype["_loadDefaultKeys"] = backup_loadDefaultKeys;
  Keyboard.Keyboard.prototype["_getDefaultKeysForRow"] = backup_DefaultKeysForRow;
  Keyboard.Keyboard.prototype["_createLayersForGroup"] = backup_createLayersForGroup;
  Keyboard.Keyboard.prototype["_commitAction"] = backup_commitAction;

  Keyboard.KeyboardController.prototype["constructor"] = backup_keyboardControllerConstructor;
  Keyboard.KeyboardController.prototype["keyvalPress"] = backup_keyvalPress;
  Keyboard.KeyboardController.prototype["keyvalRelease"] = backup_keyvalRelease;
  Keyboard.KeyboardController.prototype["commitString"] = backup_commitString;

  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] = backup_lastDeviceIsTouchScreen;
}

// Extension
function init() {
  backup_relayout = Keyboard.Keyboard.prototype["_relayout"];
  backup_loadDefaultKeys = Keyboard.Keyboard.prototype["_loadDefaultKeys"]
  backup_DefaultKeysForRow = Keyboard.Keyboard.prototype["_getDefaultKeysForRow"];
  backup_createLayersForGroup = Keyboard.Keyboard.prototype["_createLayersForGroup"];
  backup_commitAction = Keyboard.Keyboard.prototype["_commitAction"];

  backup_keyboardControllerConstructor = Keyboard.KeyboardController.prototype["constructor"];
  backup_keyvalPress = Keyboard.KeyboardController.prototype["keyvalPress"];
  backup_keyvalRelease = Keyboard.KeyboardController.prototype["keyvalRelease"];
  backup_commitString = Keyboard.KeyboardController.prototype["commitString"];

  backup_lastDeviceIsTouchScreen = Keyboard.KeyboardManager._lastDeviceIsTouchscreen;
}

function enable() {
  settings = ExtensionUtils.getSettings(
      "org.gnome.shell.extensions.randomizedosk"
  );
  _oskA11yApplicationsSettings = new Gio.Settings({
    schema_id: A11Y_APPLICATIONS_SCHEMA,
  });

  Main.layoutManager.removeChrome(Main.layoutManager.keyboardBox);

  // Set up the indicator in the status area
  if (settings.get_boolean("show-statusbar-icon")) {
    _indicator = new OSKIndicator();
    Main.panel.addToStatusArea("OSKIndicator", _indicator);
  }

  let KeyboardIsSetup = true;
  try {
    Main.keyboard._destroyKeyboard();
  } catch (e) {
    if (e instanceof TypeError) {
      // In case the keyboard is currently disabled in accessability settings, attempting to _destroyKeyboard() yields a TypeError ("TypeError: this.actor is null")
      // This doesn't affect functionality, so proceed as usual. The only difference is that we do not automatically _setupKeyboard at the end of this enable() (let the user enable the keyboard in accessability settings)
      KeyboardIsSetup = false;
    } else {
      // Something different happened
      throw e;
    }
  }

  rand = new GRand();

  enable_overrides();

  settings.connect("changed::show-statusbar-icon", function () {
    if (settings.get_boolean("show-statusbar-icon")) {
      _indicator = new OSKIndicator();
      Main.panel.addToStatusArea("OSKIndicator", _indicator);
    } else if (_indicator !== null) {
      _indicator.destroy();
      _indicator = null;
    }
  });

  settings.connect("changed::enable-randomization", function () {
    Main.keyboard._keyboard._keyboardController._onSourcesModified();
  });

  if (KeyboardIsSetup) {
    Main.keyboard._setupKeyboard();
  }

  Main.layoutManager.addTopChrome(Main.layoutManager.keyboardBox, {
    affectsStruts: settings.get_boolean("resize-desktop"),
    trackFullscreen: false,
  });
}

function disable() {
  Main.layoutManager.removeChrome(Main.layoutManager.keyboardBox);

  let KeyboardIsSetup = true;
  try {
    Main.keyboard._destroyKeyboard();
  } catch (e) {
    if (e instanceof TypeError) {
      // In case the keyboard is currently disabled in accessability settings, attempting to _destroyKeyboard() yields a TypeError ("TypeError: this.actor is null")
      // This doesn't affect functionality, so proceed as usual. The only difference is that we do not automatically _setupKeyboard at the end of this enable() (let the user enable the keyboard in accessability settings)
      KeyboardIsSetup = false;
    } else {
      // Something different happened
      throw e;
    }
  }

  // Remove indicator if it exists
  if (_indicator instanceof OSKIndicator) {
    _indicator.destroy();
    _indicator = null;
  }

  settings = null;
  rand = null;

  disable_overrides();

  if (KeyboardIsSetup) {
    Main.keyboard._setupKeyboard();
  }
  Main.layoutManager.addTopChrome(Main.layoutManager.keyboardBox);
}
