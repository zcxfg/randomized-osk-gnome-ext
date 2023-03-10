# improved-osk-gnome-ext

Makes Gnome's OnScreen Keyboard more usable.

Features:
* Includes additional buttons: Arrow keys, Esc, Tab, Ctrl, Alt, F1-12
* Supports key combinations like `Ctrl + C`, `Alt + Tab`, `Ctrl + Shift + C`, etc.
* Configurable keyboard size (landscape/portrait)
* Statusbar indicator to toggle keyboard
* Works in Gnome password modals

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

## FAQ

### My language layout doesn't have the additional keys.
If the layout you're using does not have the extended keys, let me know, and I'll add them.
Or, feel free to modify it yourself (see [/src/data/osk-layouts](https://github.com/nick-shmyrev/improved-osk-gnome-ext/tree/master/src/data) dir) and make a PR.

### Some symbols are missing...
The keyboard uses unicode characters, try installing `ttf-symbola` on archlinux (AUR)
or `ttf-ancient-fonts-symbola` on ubuntu/debian

### Do I need to enable the OSK in Gnome accessibility settings?
By default, the keyboard will pop up on touch input events.
You can use "Force touch-input" option in extension preferences
to force the OSK to appear on non-touch events.

### Extension is installed and activated, but keyboard layout doesn't change.
Gnome's default on-screen keyboard, on which this extension is based on,
uses `ibus` package, make sure you have it installed.
