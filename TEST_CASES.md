# Test cases

- OSK shows up when you click/tap text inputs and/or terminal window
- OSK can type lowercase chars
- Tapping "Shift" switches OSK to uppercase layer
- OSK can type uppercase chars
- After typing an uppercase char, OSK switches back to lowercase layer
- Once switched to Numbers layer, it stays latched until user switches to another layer
- Long-pressing characters like "1" shows a popup with additional chars, typing those chars works
- Tapping "Ctrl", "Alt", "Super", "Shift" adds highlight to those buttons
- "Ctrl", "Alt"  and/or "Super" remain latched when "Shift" is toggled on/off
- Key combinations like "Ctrl + C", "Ctrl + X", "Ctrl + V", "Ctrl + A", "Ctrl + Z", "Ctrl + Shift + Z", "Ctrl + Shift + V" (in terminal), "Alt + Tab", "Super + A" work as expected
- Esc, F1-12 keys work as expected
- OSK doesn't switch to `us-extended` layout in terminal
- OSK works in Gnome password modal
- OSK works on lock screen screensaver
- OSK works on login screen if installed as a system-wide extension
- OSK settings for landscape/portrait height work