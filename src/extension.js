"use strict";
const { Gio, GLib, GObject } = imports.gi;
const Main = imports.ui.main;
const Keyboard = imports.ui.keyboard;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Randomizer = Me.imports.randomizer;

const A11Y_APPLICATIONS_SCHEMA = "org.gnome.desktop.a11y.applications";
const EXTENSION_NAME = "org.gnome.shell.extensions.randomizedosk";

let _oskA11yApplicationsSettings;
let settings;

function keyboard_update() {
  // notify keyboard to update its layout
  Main.keyboard?._keyboard?._keyboardController._onSourcesModified();
}

function randomizerSetEnable() {
  Randomizer.setEnable(
    settings.get_boolean("layout-randomization"),
    settings.get_boolean("update-on-reopen"),
    settings.get_boolean("update-on-type")
  );
}

function enable_overrides() {
  randomizerSetEnable();
}

function disable_overrides() {
  Randomizer.setEnable(false);
}

// Extension
function init() {}

function enable() {
  settings = ExtensionUtils.getSettings(EXTENSION_NAME);
  _oskA11yApplicationsSettings = new Gio.Settings({
    schema_id: A11Y_APPLICATIONS_SCHEMA,
  });

  enable_overrides();

  settings.connect("changed::layout-randomization", function () {
    randomizerSetEnable();
    keyboard_update();
  });

  settings.connect("changed::update-on-reopen", function () {
    randomizerSetEnable();
    keyboard_update();
  });

  settings.connect("changed::update-on-type", function () {
    randomizerSetEnable();
    keyboard_update();
  });

  keyboard_update();
}

function disable() {

  disable_overrides();
  keyboard_update();

  settings = null;
}
