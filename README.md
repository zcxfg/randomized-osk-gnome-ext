# improved-osk-gnome-ext

Makes Gnome's OnScreen Keyboard more usable.

Features:
* Includes additional buttons: Arrow keys, Esc, Tab, Ctrl, Alt, F1-12
* Supports key combinations like `Ctrl + C`, `Alt + Tab`, `Ctrl + Shift + C`, etc.
* Configurable keyboard size (landscape/portrait)
* Statusbar indicator to toggle keyboard
* Works in Gnome password modals
* Works on Gnome's login screen (see [README](https://github.com/nick-shmyrev/improved-osk-gnome-ext/blob/master/README.md#as-a-system-wide-extension) for instructions)

Currently, the following layouts have extended keys: CH+FR, CH, DE, ES, FR, IT, RU, UA, US.

![Screenshot](screenshots/1.png)

This extension is a fork of [SebastianLuebke/improved-osk-gnome-ext](https://github.com/SebastianLuebke/improved-osk-gnome-ext).

## Installation

### From extensions.gnome.org

https://extensions.gnome.org/extension/4413/improved-osk/

### From source code
Clone the repo, change into its root directory, run `package-extension.sh`,
install and enable the extension:

```console
git clone https://github.com/nick-shmyrev/improved-osk-gnome-ext.git
cd ./improved-osk-gnome-ext
./package-extension.sh
gnome-extensions install improvedosk@nick-shmyrev.dev.shell-extension.zip
gnome-extensions enable improvedosk@nick-shmyrev.dev
```

After enabling extension, log out and back in to reload Gnome Shell.

### As a system-wide extension
**This is an experimental feature**, see issue [#41](https://github.com/nick-shmyrev/improved-osk-gnome-ext/issues/41) for details and bug reports! 

Installing as a system-wide extension allows Improved OSK to be used on Gnome's login screen, as well as within the user session.

To install as a system-wide extension, follow this [guide](https://help.gnome.org/admin/system-admin-guide/stable/extensions-enable.html.en), or use the `install-as-global-extension.sh` script.
If it's installed, and the keyboards doesn't show up on login screen, tap on accessibility options in upper right corner of the screen, and enable "Screen Keyboard".


## FAQ

### My language layout doesn't have the additional keys.
If the layout you're using does not have the extended keys, let me know, and I'll add them.
Or, feel free to modify it yourself (see [/src/data/osk-layouts](https://github.com/nick-shmyrev/improved-osk-gnome-ext/tree/master/src/data/osk-layouts) dir) and make a PR.

### How do I make a custom layout?
You'll need to follow the manual installation process from [README](https://github.com/nick-shmyrev/improved-osk-gnome-ext/blob/master/README.md#from-source-code),
but before running `package-extension.sh` you'll have to make changes to your preferred layout
(see [osk-layouts](https://github.com/nick-shmyrev/improved-osk-gnome-ext/tree/master/src/data/osk-layouts)), then continue with the installation process.

### I want to test this extension with a new version of Gnome.
To install the extension on an unsupported Gnome version, you can either add desired version number to `metadata.json` file and proceed with a manual installation,
or disable extension version check and then install from [extensions.gnome.org](https://extensions.gnome.org/extension/4413/improved-osk/):

```console
gsettings set org.gnome.shell disable-extension-version-validation true
```

Here are some of the test cases:
- OSK shows up when you click/tap text inputs and/or terminal window
- OSK can type lowercase chars
- Tapping "Shift" switches OSK to uppercase layer
- OSK can type uppercase chars
- After typing an uppercase char, OSK switches back to lowercase layer
- Once switched to Numbers layer, it stays latched until user switches to another layer
- Long-pressing characters like "1" shows a popup with additional chars, typing those chars works
- Tapping "Ctrl", "Alt", "Shift" adds highlight to those buttons
- "Ctrl" and/or "Alt" remain latched when "Shift" is toggled on/off
- Key combinations like "Ctrl + C", "Ctrl + X", "Ctrl + V", "Ctrl + A", "Ctrl + Z", "Ctrl + Shift + Z", "Ctrl + Shift + V" (in terminal), "Alt + Tab" work as expected
- Esc, F1-12 keys work as expected
- OSK works in Gnome password modal
- OSK works on lock-screen
- OSK settings for landscape/portrait height work

### Do I need to enable the OSK in Gnome accessibility settings?
By default, the keyboard will pop up on touch input events.
You can use "Force touch-input" option in extension preferences
to force the OSK to appear on non-touch events.

### Extension is installed and activated, but keyboard layout doesn't change.
Gnome's default on-screen keyboard, on which this extension is based on,
uses `ibus` package, make sure you have it installed.

### Some symbols are missing...
The keyboard uses unicode characters, try installing `ttf-symbola` on archlinux (AUR)
or `ttf-ancient-fonts-symbola` on ubuntu/debian
