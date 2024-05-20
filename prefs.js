"use strict";

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {}

function buildPrefsWidget() {
  let gschema = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_child("schemas").get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );

  this.settings = new Gio.Settings({
    settings_schema: gschema.lookup(
      "org.gnome.shell.extensions.improvedosk",
      true
    ),
  });

  // https://gjs-docs.gnome.org/gtk40/gtk.widget#index-properties
  let prefsWidget = new Gtk.Grid({
    margin_top: 24,
    margin_bottom: 24,
    margin_start: 24,
    margin_end: 24,
    column_spacing: 24,
    row_spacing: 12,
    visible: true,
  });

  let labelPortraitHeight = new Gtk.Label({
    label: "Portrait Height in Percent:",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelPortraitHeight, 0, 0, 1, 1);

  let inputPortraitHeight = new Gtk.SpinButton();
  inputPortraitHeight.set_range(0, 100);
  inputPortraitHeight.set_sensitive(true);
  inputPortraitHeight.set_increments(1, 10);
  prefsWidget.attach(inputPortraitHeight, 1, 0, 1, 1);
  inputPortraitHeight.set_value(settings.get_int("portrait-height"));
  inputPortraitHeight.connect("value-changed", (widget) => {
    settings.set_int("portrait-height", widget.get_value_as_int());
  });
  settings.connect("changed::portrait-height", () => {
    inputPortraitHeight.set_value(settings.get_int("portrait-height"));
  });

  let labelLandscapeHeight = new Gtk.Label({
    label: "Landscape Height in Percent:",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelLandscapeHeight, 0, 1, 1, 1);

  let inputLandscapeHeight = new Gtk.SpinButton();
  inputLandscapeHeight.set_range(0, 100);
  inputLandscapeHeight.set_sensitive(true);
  inputLandscapeHeight.set_increments(1, 10);
  prefsWidget.attach(inputLandscapeHeight, 1, 1, 1, 1);
  inputLandscapeHeight.set_value(settings.get_int("landscape-height"));
  inputLandscapeHeight.connect("value-changed", (widget) => {
    settings.set_int("landscape-height", widget.get_value_as_int());
  });
  settings.connect("changed::landscape-height", () => {
    inputLandscapeHeight.set_value(settings.get_int("landscape-height"));
  });

  let labelResizeDesktop = new Gtk.Label({
    label: "Resize Desktop (Shell restart required):",
    halign: Gtk.Align.START,
    visible: true,
  });

  let inputResizeDesktop = new Gtk.CheckButton({
    label: "active",
  });
  inputResizeDesktop.set_active(settings.get_boolean("resize-desktop"));
  inputResizeDesktop.connect("toggled", (widget) => {
    settings.set_boolean("resize-desktop", widget.get_active());
  });
  settings.connect("changed::resize-dekstop", () => {
    inputResizeDesktop.set_active(settings.get_boolean("resize-desktop"));
  });
  prefsWidget.attach(inputResizeDesktop, 1, 2, 1, 1);

  prefsWidget.attach(labelResizeDesktop, 0, 2, 1, 1);

  let labelIgnoreTouchInput = new Gtk.Label({
    label: "Ignore touch-input:",
    halign: Gtk.Align.START,
    visible: true,
  });

  let inputIgnoreTouchInput = new Gtk.CheckButton({
    label: "active",
  });
  inputIgnoreTouchInput.set_active(settings.get_boolean("ignore-touch-input"));
  inputIgnoreTouchInput.connect("toggled", (widget) => {
    settings.set_boolean("ignore-touch-input", widget.get_active());
  });
  settings.connect("changed::ignore-touch-input", () => {
    inputIgnoreTouchInput.set_active(
      settings.get_boolean("ignore-touch-input")
    );
  });
  prefsWidget.attach(inputIgnoreTouchInput, 1, 3, 1, 1);
  prefsWidget.attach(labelIgnoreTouchInput, 0, 3, 1, 1);

  let labelShowStatusbarIcon = new Gtk.Label({
    label: "Show OSK toggle in statusbar:",
    halign: Gtk.Align.START,
    visible: true,
  });

  let inputShowStatusbarIcon = new Gtk.CheckButton({
    label: "active",
  });
  inputShowStatusbarIcon.set_active(
    settings.get_boolean("show-statusbar-icon")
  );
  inputShowStatusbarIcon.connect("toggled", (widget) => {
    settings.set_boolean("show-statusbar-icon", widget.get_active());
  });
  settings.connect("changed::show-statusbar-icon", () => {
    inputShowStatusbarIcon.set_active(
      settings.get_boolean("show-statusbar-icon")
    );
  });
  prefsWidget.attach(inputShowStatusbarIcon, 1, 4, 1, 1);
  prefsWidget.attach(labelShowStatusbarIcon, 0, 4, 1, 1);


  const labelEnableRandomization = new Gtk.Label({
    label: "Enable randomization",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelEnableRandomization, 0, 6, 1, 1);

  let inputEnableRandomization = new Gtk.Switch({
    halign: Gtk.Align.START,
    visible: true,
  });
  this.settings.bind(
    "enable-randomization",
    inputEnableRandomization,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  prefsWidget.attach(inputEnableRandomization, 1, 6, 1, 1);

  const labelUpdateEveryKeystroke = new Gtk.Label({
    label: "Update every keystroke",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelUpdateEveryKeystroke, 0, 7, 1, 1);

  let inputUpdateEveryKeystroke = new Gtk.Switch({
    halign: Gtk.Align.START,
    visible: true,
  });
  this.settings.bind(
    "update-every-keystroke",
    inputUpdateEveryKeystroke,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  prefsWidget.attach(inputUpdateEveryKeystroke, 1, 7, 1, 1);

  if (typeof prefsWidget.show_all === 'function') {
    // Adds backward compatibility with Gnome 38
    prefsWidget.show_all();
  } else {
    // Gnome versions >= 40
    // https://gjs-docs.gnome.org/gtk40/gtk.widget#method-show
    prefsWidget.show();
  }

  return prefsWidget;
}
