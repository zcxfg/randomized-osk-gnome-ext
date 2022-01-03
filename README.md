# improved-osk-gnome-ext

Makes Gnome's onscreen keyboard more useable.

Features:
* More buttons like CTRL, F-Keys, Arrow Keys...
* Configurable keyboard size (landscape/portrait)
* Toggle auto keyboard popup on touch input 
* Works in gnome password modals
* Statusbar indicator to toggle keyboard

This extension is a fork of [SebastianLuebke/improved-osk-gnome-ext](https://github.com/SebastianLuebke/improved-osk-gnome-ext). 

![Screenshot](screenshots/1.png)

## Installation

### From source code

Clone the git repo

```console
git clone https://github.com/nick-shmyrev/improved-osk-gnome-ext.git ~/.local/share/gnome-shell/extensions/improvedosk@nick-shmyrev.dev
```

### From extensions.gnome.org

https://extensions.gnome.org/extension/4413/improved-osk/

## Activation

After installing and enabling extension, reload Gnome Shell. On X11, press `alt + F2` and enter `r`. On Wayland, log out and back in to reload Gnome Shell.

## FAQ

### Some symbols are missing...
the keyboard uses unicode characters, try install ttf-symbola on archlinux (AUR) or ttf-ancient-fonts-symbola on ubuntu/debian

### Do i need to enable the OSK in Gnome accessibility settings?
By default the keyboard will popup on touch input events. Enabling the keyboard in the accessibility settings just allows the OSK to popup on non touch input.

### Extension is installed and activated, but keyboard layout doesn't change.
Gnome's default on-screen keyboard, on which this extension is based on, uses `ibus` package, make sure you have it installed.
