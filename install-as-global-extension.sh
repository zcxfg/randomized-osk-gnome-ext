#!/bin/sh

# Run this script to install extension system-wide. This will allow it to run on Gnome's login screen

zip_filename="randomizedosk@zcxfg.dev.shell-extension.zip"

# Check if "randomizedosk@zcxfg.dev.shell-extension.zip" exists in the current directory
if [ ! -f "$zip_filename" ]; then
    echo "$zip_filename file not found, exiting..."
    exit
fi

# Extract .zip into "/usr/share/gnome-shell/extensions/" directory
sudo unzip -o "$zip_filename" -d /usr/share/gnome-shell/extensions/randomizedosk@zcxfg.dev/

# Check if "user" file exists in "/etc/dconf/profile/" directory
if [ ! -f /etc/dconf/profile/user ]; then
    # If "user" file doesn't exist, create it
    sudo touch /etc/dconf/profile/user
fi

# Check if "user" file has line "user-db:user"
if ! grep -q "^user-db:user$" /etc/dconf/profile/user; then
    # If "user" file doesn't have line "user-db:user", add it to file
    echo "user-db:user" | sudo tee -a /etc/dconf/profile/user > /dev/null
fi

# Check if "user" file has line "system-db:local"
if ! grep -q "^system-db:local$" /etc/dconf/profile/user; then
    # If "user" file doesn't have line "system-db:local", add it to file
    echo "system-db:local" | sudo tee -a /etc/dconf/profile/user > /dev/null
fi

# Check if "00-extensions" file exists in "/etc/dconf/db/local.d/" directory
if [ ! -f /etc/dconf/db/local.d/00-extensions ]; then
    # If "00-extensions" file doesn't exist, create it
    sudo touch /etc/dconf/db/local.d/00-extensions

    # Add "[org/gnome/shell]" line to the top of the file
    echo "[org/gnome/shell]" | sudo tee /etc/dconf/db/local.d/00-extensions > /dev/null
fi

# Check if enabled-extensions=[ line exists in 00-extensions file
if grep -q "enabled-extensions=\[" "/etc/dconf/db/local.d/00-extensions"; then
    # If enabled-extensions=[ line exists, but randomizedosk@zcxfg.dev is not included,
    # add it to the line starting with enabled-extensions=[ right after enabled-extensions=[
    sudo sed -i '/enabled-extensions=\[/ s/\]/, \x27randomizedosk@zcxfg.dev\x27\]/' /etc/dconf/db/local.d/00-extensions
else
    # If enabled-extension=[ line does not exist, add enabled-extension=[randomizedosk@zcxfg.dev] to the end of the file.
    echo "enabled-extensions=['randomizedosk@zcxfg.dev']" | sudo tee --append /etc/dconf/db/local.d/00-extensions > /dev/null
fi

# Update dconf database with new settings
sudo dconf update

echo "$zip_filename installed as a system-wide extension. Please reboot to apply changes."