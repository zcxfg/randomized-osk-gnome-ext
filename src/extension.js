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
  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] = override_lastDeviceIsTouchScreen;

  // Unregister original osk layouts resource file
  const defaultLayouts = Gio.Resource.load(
      (GLib.getenv('JHBUILD_PREFIX') || '/usr') +
      '/share/gnome-shell/gnome-shell-osk-layouts.gresource');
  defaultLayouts._unregister();

  const modifiedLayoutsPath = Me.dir.get_child('data')
      .get_child('gnome-shell-osk-layouts.gresource').get_path();
  // Register modified osk layouts resource file
  const modifiedLayouts = Gio.Resource.load(modifiedLayoutsPath);
  modifiedLayouts._register();
}

function disable_overrides() {
  Keyboard.Keyboard.prototype["_relayout"] = backup_relayout;
  Keyboard.KeyboardManager.prototype["_lastDeviceIsTouchscreen"] = backup_lastDeviceIsTouchScreen;

  const modifiedLayoutsPath = Me.dir.get_child('data')
      .get_child('gnome-shell-osk-layouts.gresource').get_path();
  // Unregister modified osk layouts resource file
  const modifiedOskLayouts = Gio.Resource.load(modifiedLayoutsPath);
  modifiedOskLayouts._unregister();

  // Register original osk layouts resource file
  const defaultLayouts = Gio.Resource.load(
      (GLib.getenv('JHBUILD_PREFIX') || '/usr') +
      '/share/gnome-shell/gnome-shell-osk-layouts.gresource');
  defaultLayouts._register();
}

// Extension
function init() {
  backup_relayout = Keyboard.Keyboard.prototype["_relayout"];

  backup_lastDeviceIsTouchScreen = Keyboard.KeyboardManager._lastDeviceIsTouchscreen;
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

  disable_overrides();

  if (KeyboardIsSetup) {
    Main.keyboard._setupKeyboard();
  }
  Main.layoutManager.addTopChrome(Main.layoutManager.keyboardBox);
}
