export MUTTER_DEBUG_DUMMY_MODE_SPECS=1920x1080
export SHELL_DEBUG=backtrace-warnings
dbus-run-session -- gnome-shell --nested --wayland
