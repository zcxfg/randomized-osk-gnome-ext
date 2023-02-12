"use strict";
const { Gio, GLib, St, Clutter, GObject } = imports.gi;
const Main = imports.ui.main;
const Keyboard = imports.ui.keyboard;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const A11Y_APPLICATIONS_SCHEMA = "org.gnome.desktop.a11y.applications";
let _oskA11yApplicationsSettings;
let backup_lastDeviceIsTouchScreen;
let backup_relayout;
let backup_touchMode;
let currentSeat;
let _indicator;
let settings;

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

      this.connect("button-press-event", function (_actor, event) {
        let button = event.get_button();

        if (button == 1) {
          toggleOSK();
        }
        if (button == 3) {
          ExtensionUtils.openPrefs();
        }
      });

      this.connect("touch-event", function () {
        toggleOSK();
      });
    }
  }
);

function toggleOSK() {
  if (Main.keyboard._keyboard._keyboardVisible) return Main.keyboard.close();

  Main.keyboard.open(Main.layoutManager.bottomIndex);
}

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

function enable_overrides() {
  Keyboard.Keyboard.prototype["_relayout"] = override_relayout;
  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] =
    override_lastDeviceIsTouchScreen;

  // Unregister original osk layouts resource file
  getDefaultLayouts()._unregister();

  // Register modified osk layouts resource file
  getModifiedLayouts()._register();
}

function disable_overrides() {
  Keyboard.Keyboard.prototype["_relayout"] = backup_relayout;
  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] =
    backup_lastDeviceIsTouchScreen;

  // Unregister modified osk layouts resource file
  getModifiedLayouts()._unregister();

  // Register original osk layouts resource file
  getDefaultLayouts()._register();
}

function getModifiedLayouts() {
  const modifiedLayoutsPath = Me.dir
    .get_child("data")
    .get_child("gnome-shell-osk-layouts.gresource")
    .get_path();
  return Gio.Resource.load(modifiedLayoutsPath);
}

function getDefaultLayouts() {
  return Gio.Resource.load(
    (GLib.getenv("JHBUILD_PREFIX") || "/usr") +
      "/share/gnome-shell/gnome-shell-osk-layouts.gresource"
  );
}

// In case the keyboard is currently disabled in accessability settings, attempting to _destroyKeyboard() yields a TypeError ("TypeError: this.actor is null")
// This function proofs this condition, which would be used in the parent function to determin whether to run _setupKeyboard
function tryDestroyKeyboard() {
  try {
    Main.keyboard._destroyKeyboard();
  } catch (e) {
    if (e instanceof TypeError) {
      return false;
    } else {
      // Something different happened
      throw e;
    }
  }
  return true;
}

// Extension
function init() {
  backup_relayout = Keyboard.Keyboard.prototype["_relayout"];

  backup_lastDeviceIsTouchScreen =
    Keyboard.KeyboardManager._lastDeviceIsTouchscreen;

  currentSeat = Clutter.get_default_backend().get_default_seat();
  backup_touchMode = currentSeat.get_touch_mode;
}

function enable() {
  settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.improvedosk"
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

  if (settings.get_boolean("force-touch-input")) {
    currentSeat.get_touch_mode = () => true;
  }

  let KeyboardIsSetup = tryDestroyKeyboard();

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

  settings.connect("changed::force-touch-input", function () {
    if (settings.get_boolean("force-touch-input")) {
      currentSeat.get_touch_mode = () => true;
    } else {
      currentSeat.get_touch_mode = backup_touchMode;
    }
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

  currentSeat.get_touch_mode = backup_touchMode;

  let KeyboardIsSetup = tryDestroyKeyboard();

  // Remove indicator if it exists
  if (_indicator instanceof OSKIndicator) {
    _indicator.destroy();
    _indicator = null;
  }

  settings = null;

  disable_overrides();

  if (KeyboardIsSetup) {
    Main.keyboard._setupKeyboard();
  }
  Main.layoutManager.addTopChrome(Main.layoutManager.keyboardBox);
}
