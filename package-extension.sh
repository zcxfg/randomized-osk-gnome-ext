#!/bin/sh

# Run this script to package all necessary extension files into a .zip

root_dir=$PWD
zip_filename="improvedosk@nick-shmyrev.dev.shell-extension.zip"

# Remove existing .zip
rm -f "$zip_filename"

# Compile gnome-shell-osk-layouts.gresource
cd src/data/ || exit
./compile-gresource.sh

# Compile gschemas.compiled
cd ../schemas || exit
glib-compile-schemas .

cd "$root_dir" || exit

# Create expected .zip folders structure
mkdir dist
cp LICENSE README.md src/*.js src/metadata.json src/stylesheet.css dist/
mkdir dist/data
cp src/data/gnome-shell-osk-layouts.gresource dist/data/
mkdir dist/schemas
cp src/schemas/gschemas.compiled dist/schemas/

# Add necessary extension files to archive
cd dist/ || exit
zip -r "../$zip_filename" ./*
cd "$root_dir" || exit

# Cleanup
rm -r dist src/data/*.gresource src/schemas/*.compiled
